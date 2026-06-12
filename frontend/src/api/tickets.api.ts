import { api } from '@/lib/axios';
import type { Ticket, PaginatedResult } from '@/types';

export interface CreateTicketPayload {
  title: string;
  description: string;
  priority?: string;
  category?: string;
  organizationId: string;
  assigneeId?: string;
}

export interface UpdateTicketPayload {
  title?: string;
  description?: string;
  priority?: string;
  status?: string;
  category?: string;
  assigneeId?: string | null;
}

export interface TicketQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  category?: string;
  organizationId?: string;
  assigneeId?: string;
  reporterId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const ticketsApi = {
  create: (data: CreateTicketPayload): Promise<Ticket> =>
    api.post('/tickets', data),

  getAll: (params?: TicketQuery): Promise<PaginatedResult<Ticket>> =>
    api.get('/tickets', { params }),

  getOne: (id: string): Promise<Ticket> =>
    api.get(`/tickets/${id}`),

  update: (id: string, data: UpdateTicketPayload): Promise<Ticket> =>
    api.patch(`/tickets/${id}`, data),

  delete: (id: string) =>
    api.delete(`/tickets/${id}`),

  getHistory: (id: string) =>
    api.get(`/tickets/${id}/history`),

  assign: (id: string, assigneeId: string | null) =>
    api.patch(`/tickets/${id}/assign`, { assigneeId }),
};
