import { cn } from '@/lib/utils';
import {
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
} from '@/lib/ticket-utils';
import type { TicketStatus, TicketPriority } from '@/types';

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', PRIORITY_COLORS[priority])}>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
