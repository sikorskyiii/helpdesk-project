import { api } from '@/lib/axios';
import type { Organization, OrganizationMember, PaginatedResult } from '@/types';

export interface CreateOrgPayload {
  name: string;
  slug: string;
  description?: string;
}

export interface UpdateOrgPayload {
  name?: string;
  description?: string;
  logoUrl?: string;
}

export interface InviteMemberPayload {
  email: string;
  roleId: string;
}

export interface OrgStats {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  totalMembers: number;
  byStatus: { status: string; count: number }[];
  byPriority: { priority: string; count: number }[];
}

export const organizationsApi = {
  create: (data: CreateOrgPayload): Promise<Organization> =>
    api.post('/organizations', data),

  getAll: (params?: Record<string, any>): Promise<PaginatedResult<Organization>> =>
    api.get('/organizations', { params }),

  getMine: (): Promise<Organization[]> =>
    api.get('/organizations/mine'),

  getOne: (id: string): Promise<Organization> =>
    api.get(`/organizations/${id}`),

  update: (id: string, data: UpdateOrgPayload): Promise<Organization> =>
    api.patch(`/organizations/${id}`, data),

  getStats: (id: string): Promise<OrgStats> =>
    api.get(`/organizations/${id}/stats`),

  getMembers: (id: string): Promise<OrganizationMember[]> =>
    api.get(`/organizations/${id}/members`),

  inviteMember: (id: string, data: InviteMemberPayload): Promise<OrganizationMember> =>
    api.post(`/organizations/${id}/members`, data),

  updateMemberRole: (id: string, memberId: string, roleId: string): Promise<OrganizationMember> =>
    api.patch(`/organizations/${id}/members/${memberId}/role`, { roleId }),

  removeMember: (id: string, memberId: string) =>
    api.delete(`/organizations/${id}/members/${memberId}`),

  getRoles: () => api.get('/organizations/roles'),
};
