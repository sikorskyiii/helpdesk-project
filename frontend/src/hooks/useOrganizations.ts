'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  organizationsApi,
  CreateOrgPayload,
  UpdateOrgPayload,
  InviteMemberPayload,
} from '@/api/organizations.api';

export const orgKeys = {
  all: ['organizations'] as const,
  mine: () => [...orgKeys.all, 'mine'] as const,
  detail: (id: string) => [...orgKeys.all, id] as const,
  members: (id: string) => [...orgKeys.detail(id), 'members'] as const,
  stats: (id: string) => [...orgKeys.detail(id), 'stats'] as const,
};

export function useMyOrganizations() {
  return useQuery({
    queryKey: orgKeys.mine(),
    queryFn: organizationsApi.getMine,
  });
}

export function useOrganization(id: string) {
  return useQuery({
    queryKey: orgKeys.detail(id),
    queryFn: () => organizationsApi.getOne(id),
    enabled: !!id,
  });
}

export function useOrgMembers(orgId: string) {
  return useQuery({
    queryKey: orgKeys.members(orgId),
    queryFn: () => organizationsApi.getMembers(orgId),
    enabled: !!orgId,
  });
}

export function useOrgStats(orgId: string) {
  return useQuery({
    queryKey: orgKeys.stats(orgId),
    queryFn: () => organizationsApi.getStats(orgId),
    enabled: !!orgId,
  });
}

export function useCreateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOrgPayload) => organizationsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orgKeys.mine() });
      toast.success('Organization created!');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to create organization'),
  });
}

export function useUpdateOrganization(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateOrgPayload) => organizationsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orgKeys.detail(id) });
      toast.success('Organization updated!');
    },
    onError: (err: any) => toast.error(err?.message || 'Update failed'),
  });
}

export function useInviteMember(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InviteMemberPayload) => organizationsApi.inviteMember(orgId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orgKeys.members(orgId) });
      toast.success('Member invited successfully!');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to invite member'),
  });
}

export function useUpdateMemberRole(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, roleId }: { memberId: string; roleId: string }) =>
      organizationsApi.updateMemberRole(orgId, memberId, roleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orgKeys.members(orgId) });
      toast.success('Role updated!');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to update role'),
  });
}

export function useRemoveMember(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => organizationsApi.removeMember(orgId, memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orgKeys.members(orgId) });
      toast.success('Member removed');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to remove member'),
  });
}
