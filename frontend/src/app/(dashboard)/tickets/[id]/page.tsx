import type { Metadata } from 'next';
import { TicketDetail } from '@/components/tickets/TicketDetail';

export const metadata: Metadata = { title: 'Ticket Details' };

export default function TicketDetailPage({ params }: { params: { id: string } }) {
  return <TicketDetail ticketId={params.id} />;
}
