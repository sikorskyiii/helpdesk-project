'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTicket, useUpdateTicket, useDeleteTicket, useTicketHistory } from '@/hooks/useTickets';
import { StatusBadge, PriorityBadge } from './TicketBadge';
import { ALL_STATUSES, ALL_PRIORITIES } from '@/lib/ticket-utils';
import { formatDateTime, getInitials } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

export function TicketDetail({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const { data: ticket, isLoading } = useTicket(ticketId);
  const { data: history } = useTicketHistory(ticketId);
  const updateTicket = useUpdateTicket(ticketId);
  const deleteTicket = useDeleteTicket();
  const currentUser = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-muted animate-pulse rounded-xl" />
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!ticket) return <div className="text-center py-16 text-muted-foreground">Ticket not found</div>;

  const handleDelete = async () => {
    if (!confirm('Delete this ticket? This cannot be undone.')) return;
    deleteTicket.mutate(ticketId, { onSuccess: () => router.push('/tickets') });
  };

  const isReporter = ticket.reporterId === currentUser?.id;
  const isAssignee = ticket.assigneeId === currentUser?.id;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <button onClick={() => router.back()} className="hover:text-foreground transition-colors">
              ← Back
            </button>
            <span>/</span>
            <span className="truncate">{ticket.organization?.name}</span>
          </div>
          <h1 className="text-2xl font-bold">{ticket.title}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            {ticket.category && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-secondary font-medium">
                {ticket.category}
              </span>
            )}
          </div>
        </div>

        {(isReporter || isAssignee) && (
          <button
            onClick={handleDelete}
            className="text-sm text-destructive border border-destructive/30 px-3 py-1.5 rounded-lg hover:bg-destructive/5 transition-colors shrink-0"
          >
            Delete
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 border-b">
            {(['details', 'history'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${
                  activeTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'details' && (
            <div className="border rounded-xl p-5 bg-card">
              <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">Description</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{ticket.description}</p>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="border rounded-xl bg-card divide-y">
              {!history?.length ? (
                <p className="text-center py-8 text-muted-foreground text-sm">No changes recorded yet</p>
              ) : (
                (history as any[]).map((entry: any) => (
                  <div key={entry.id} className="px-5 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                        {getInitials(entry.changedBy.firstName, entry.changedBy.lastName)}
                      </div>
                      <span className="font-medium">{entry.changedBy.firstName} {entry.changedBy.lastName}</span>
                      <span className="text-muted-foreground">changed</span>
                      <span className="font-medium">{entry.field}</span>
                    </div>
                    <div className="ml-8 mt-1 text-xs text-muted-foreground flex items-center gap-2">
                      <span className="line-through">{entry.oldValue || '—'}</span>
                      <span>→</span>
                      <span className="font-medium text-foreground">{entry.newValue || '—'}</span>
                      <span className="ml-auto">{formatDateTime(entry.createdAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quick edit */}
          <div className="border rounded-xl p-4 bg-card space-y-4">
            <h3 className="font-semibold text-sm">Details</h3>

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">Status</label>
              <select
                value={ticket.status}
                onChange={(e) => updateTicket.mutate({ status: e.target.value })}
                className="w-full mt-1.5 px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none"
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">Priority</label>
              <select
                value={ticket.priority}
                onChange={(e) => updateTicket.mutate({ priority: e.target.value })}
                className="w-full mt-1.5 px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none"
              >
                {ALL_PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">Reporter</label>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {getInitials(ticket.reporter.firstName, ticket.reporter.lastName)}
                </div>
                <span className="text-sm">{ticket.reporter.firstName} {ticket.reporter.lastName}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase">Assignee</label>
              <div className="mt-1.5 text-sm text-muted-foreground">
                {ticket.assignee
                  ? `${ticket.assignee.firstName} ${ticket.assignee.lastName}`
                  : <span className="italic">Unassigned</span>}
              </div>
            </div>

            <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Created</span>
                <span>{formatDateTime(ticket.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span>Updated</span>
                <span>{formatDateTime(ticket.updatedAt)}</span>
              </div>
              {ticket.resolvedAt && (
                <div className="flex justify-between">
                  <span>Resolved</span>
                  <span>{formatDateTime(ticket.resolvedAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
