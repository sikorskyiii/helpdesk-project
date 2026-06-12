'use client';

import { useState } from 'react';
import { useOrganization, useOrgMembers, useOrgStats, useInviteMember, useRemoveMember, useUpdateMemberRole } from '@/hooks/useOrganizations';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getInitials, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

const inviteSchema = z.object({
  email: z.string().email(),
  roleId: z.string().uuid(),
});
type InviteForm = z.infer<typeof inviteSchema>;

const ROLE_OPTIONS = [
  { value: '', label: 'Select role' },
  { value: 'ORG_ADMIN', label: 'Admin' },
  { value: 'AGENT', label: 'Agent' },
  { value: 'CUSTOMER', label: 'Customer' },
];

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="border rounded-xl p-4 bg-card">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

export function OrganizationDetail({ orgId }: { orgId: string }) {
  const { data: org, isLoading: orgLoading } = useOrganization(orgId);
  const { data: members } = useOrgMembers(orgId);
  const { data: stats } = useOrgStats(orgId);
  const inviteMember = useInviteMember(orgId);
  const removeMember = useRemoveMember(orgId);
  const [showInvite, setShowInvite] = useState(false);
  const currentUser = useAuthStore((s) => s.user);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteForm>({ resolver: zodResolver(inviteSchema) });

  const onInvite = (data: InviteForm) => {
    inviteMember.mutate(data, { onSuccess: () => { reset(); setShowInvite(false); } });
  };

  if (orgLoading) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-muted animate-pulse rounded-xl" />
        <div className="h-40 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!org) return <div className="text-center py-16 text-muted-foreground">Organization not found</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{org.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">/{org.slug}</p>
          {org.description && <p className="text-muted-foreground mt-2">{org.description}</p>}
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${org.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {org.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Tickets" value={stats.totalTickets} color="text-foreground" />
          <StatCard label="Open Tickets" value={stats.openTickets} color="text-blue-600" />
          <StatCard label="Resolved" value={stats.resolvedTickets} color="text-green-600" />
          <StatCard label="Members" value={stats.totalMembers} color="text-purple-600" />
        </div>
      )}

      {/* Members */}
      <div className="border rounded-xl bg-card">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">Members ({members?.length ?? 0})</h2>
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
          >
            {showInvite ? 'Cancel' : '+ Invite'}
          </button>
        </div>

        {showInvite && (
          <div className="p-4 border-b bg-muted/30">
            <form onSubmit={handleSubmit(onInvite)} className="flex gap-3 items-start">
              <div className="flex-1">
                <input
                  {...register('email')}
                  placeholder="Email address"
                  className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {errors.email && <p className="text-destructive text-xs mt-1">{errors.email.message}</p>}
              </div>
              <div className="w-36">
                <select
                  {...register('roleId')}
                  className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Role</option>
                  <option value="agent-role-id">Agent</option>
                  <option value="customer-role-id">Customer</option>
                </select>
                {errors.roleId && <p className="text-destructive text-xs mt-1">{errors.roleId.message}</p>}
              </div>
              <button
                type="submit"
                disabled={inviteMember.isPending}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {inviteMember.isPending ? 'Inviting...' : 'Invite'}
              </button>
            </form>
          </div>
        )}

        <div className="divide-y">
          {members?.map((member: any) => (
            <div key={member.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                  {getInitials(member.user.firstName, member.user.lastName)}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {member.user.firstName} {member.user.lastName}
                    {member.user.id === currentUser?.id && (
                      <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{member.user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary font-medium">
                  {member.role.name.replace('_', ' ')}
                </span>
                {member.user.id !== org.ownerId && member.user.id !== currentUser?.id && (
                  <button
                    onClick={() => removeMember.mutate(member.id)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
