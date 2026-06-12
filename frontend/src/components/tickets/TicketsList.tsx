'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTickets, useCreateTicket } from '@/hooks/useTickets';
import { useMyOrganizations } from '@/hooks/useOrganizations';
import { StatusBadge, PriorityBadge } from './TicketBadge';
import { ALL_STATUSES, ALL_PRIORITIES } from '@/lib/ticket-utils';
import { formatDateTime } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { TicketQuery } from '@/api/tickets.api';

const createSchema = z.object({
  title: z.string().min(5, 'At least 5 characters'),
  description: z.string().min(10, 'At least 10 characters'),
  priority: z.string().optional(),
  category: z.string().optional(),
  organizationId: z.string().uuid('Select an organization'),
});
type CreateForm = z.infer<typeof createSchema>;

export function TicketsList() {
  const [query, setQuery] = useState<TicketQuery>({ page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' });
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useTickets(query);
  const { data: orgs } = useMyOrganizations();
  const createTicket = useCreateTicket();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateForm>({ resolver: zodResolver(createSchema) });

  const onSubmit = (form: CreateForm) => {
    createTicket.mutate(form as any, {
      onSuccess: () => { reset(); setShowForm(false); },
    });
  };

  const setFilter = (key: keyof TicketQuery, value: string) => {
    setQuery((q) => ({ ...q, [key]: value || undefined, page: 1 }));
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          placeholder="Search tickets..."
          value={query.search ?? ''}
          onChange={(e) => setFilter('search', e.target.value)}
          className="flex-1 min-w-48 px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <select
          value={query.status ?? ''}
          onChange={(e) => setFilter('status', e.target.value)}
          className="px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none"
        >
          <option value="">All Statuses</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select
          value={query.priority ?? ''}
          onChange={(e) => setFilter('priority', e.target.value)}
          className="px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none"
        >
          <option value="">All Priorities</option>
          {ALL_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button
          onClick={() => setShowForm(!showForm)}
          className="ml-auto bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
        >
          {showForm ? 'Cancel' : '+ New Ticket'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="border rounded-xl p-6 bg-card">
          <h3 className="font-semibold mb-4">Create Ticket</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div>
              <label className="text-sm font-medium">Title</label>
              <input
                {...register('title')}
                placeholder="Brief description of the issue"
                className="w-full mt-1 px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.title && <p className="text-destructive text-xs mt-1">{errors.title.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea
                {...register('description')}
                rows={4}
                placeholder="Detailed description of the problem..."
                className="w-full mt-1 px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
              {errors.description && <p className="text-destructive text-xs mt-1">{errors.description.message}</p>}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">Organization</label>
                <select
                  {...register('organizationId')}
                  className="w-full mt-1 px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none"
                >
                  <option value="">Select org</option>
                  {orgs?.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
                {errors.organizationId && <p className="text-destructive text-xs mt-1">{errors.organizationId.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium">Priority</label>
                <select
                  {...register('priority')}
                  className="w-full mt-1 px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM" selected>Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <input
                  {...register('category')}
                  placeholder="e.g. billing"
                  className="w-full mt-1 px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-muted transition-colors">Cancel</button>
              <button type="submit" disabled={createTicket.isPending} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {createTicket.isPending ? 'Creating...' : 'Create Ticket'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : !data?.data?.length ? (
        <div className="text-center py-16 border rounded-xl text-muted-foreground">
          <p className="text-lg">No tickets found</p>
          <p className="text-sm mt-1">Create your first ticket to get started.</p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Priority</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Assignee</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.data.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/tickets/${ticket.id}`} className="font-medium hover:text-primary transition-colors">
                      {ticket.title}
                    </Link>
                    <div className="flex gap-2 mt-1 md:hidden">
                      <StatusBadge status={ticket.status} />
                      <PriorityBadge priority={ticket.priority} />
                    </div>
                    {ticket.category && (
                      <p className="text-xs text-muted-foreground mt-0.5">{ticket.category}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <StatusBadge status={ticket.status} />
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <PriorityBadge priority={ticket.priority} />
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                    {ticket.assignee
                      ? `${ticket.assignee.firstName} ${ticket.assignee.lastName}`
                      : <span className="text-xs italic">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                    {formatDateTime(ticket.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {data.meta.totalPages > 1 && (
            <div className="px-4 py-3 border-t flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {data.meta.page} of {data.meta.totalPages} ({data.meta.total} total)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setQuery((q) => ({ ...q, page: (q.page ?? 1) - 1 }))}
                  disabled={(query.page ?? 1) <= 1}
                  className="px-3 py-1 border rounded-lg hover:bg-muted disabled:opacity-40 transition-colors"
                >
                  Prev
                </button>
                <button
                  onClick={() => setQuery((q) => ({ ...q, page: (q.page ?? 1) + 1 }))}
                  disabled={(query.page ?? 1) >= data.meta.totalPages}
                  className="px-3 py-1 border rounded-lg hover:bg-muted disabled:opacity-40 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
