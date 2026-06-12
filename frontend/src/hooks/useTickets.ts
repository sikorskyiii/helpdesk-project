'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ticketsApi, CreateTicketPayload, UpdateTicketPayload, TicketQuery } from '@/api/tickets.api';

export const ticketKeys = {
  all: ['tickets'] as const,
  list: (q?: TicketQuery) => [...ticketKeys.all, 'list', q] as const,
  detail: (id: string) => [...ticketKeys.all, id] as const,
  history: (id: string) => [...ticketKeys.detail(id), 'history'] as const,
};

export function useTickets(query?: TicketQuery) {
  return useQuery({
    queryKey: ticketKeys.list(query),
    queryFn: () => ticketsApi.getAll(query),
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: ticketKeys.detail(id),
    queryFn: () => ticketsApi.getOne(id),
    enabled: !!id,
  });
}

export function useTicketHistory(id: string) {
  return useQuery({
    queryKey: ticketKeys.history(id),
    queryFn: () => ticketsApi.getHistory(id),
    enabled: !!id,
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTicketPayload) => ticketsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ticketKeys.all });
      toast.success('Ticket created!');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to create ticket'),
  });
}

export function useUpdateTicket(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateTicketPayload) => ticketsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ticketKeys.detail(id) });
      qc.invalidateQueries({ queryKey: ticketKeys.all });
      toast.success('Ticket updated!');
    },
    onError: (err: any) => toast.error(err?.message || 'Update failed'),
  });
}

export function useDeleteTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ticketsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ticketKeys.all });
      toast.success('Ticket deleted');
    },
    onError: (err: any) => toast.error(err?.message || 'Delete failed'),
  });
}

export function useAssignTicket(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assigneeId: string | null) => ticketsApi.assign(id, assigneeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ticketKeys.detail(id) });
      toast.success('Ticket assigned!');
    },
    onError: (err: any) => toast.error(err?.message || 'Assignment failed'),
  });
}
