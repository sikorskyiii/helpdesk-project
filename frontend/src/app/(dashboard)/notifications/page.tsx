import type { Metadata } from 'next';
import { NotificationsList } from '@/components/notifications/NotificationsList';

export const metadata: Metadata = { title: 'Notifications' };

export default function NotificationsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-muted-foreground">Stay updated on ticket activity.</p>
      </div>
      <NotificationsList />
    </div>
  );
}
