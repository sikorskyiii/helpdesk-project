import type { Metadata } from 'next';
import { TicketsList } from '@/components/tickets/TicketsList';

export const metadata: Metadata = { title: 'Tickets' };

export default function TicketsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tickets</h1>
        <p className="text-muted-foreground">Manage and track support requests.</p>
      </div>
      <TicketsList />
    </div>
  );
}
