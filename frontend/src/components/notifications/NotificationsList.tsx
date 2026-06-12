'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useClearNotifications,
} from '@/hooks/useNotifications';
import { formatDateTime } from '@/lib/utils';
import type { Notification } from '@/types';

const TYPE_ICONS: Record<string, string> = {
  TICKET_ASSIGNED: '🎯',
  STATUS_CHANGED: '🔄',
  NEW_COMMENT: '💬',
  MENTIONED: '🔔',
  TICKET_CREATED: '✅',
  MEMBER_INVITED: '👥',
};

function NotificationItem({ notification }: { notification: Notification & { ticket?: any } }) {
  const markAsRead = useMarkAsRead();
  const deleteNotif = useDeleteNotification();

  const handleRead = () => {
    if (!notification.isRead) markAsRead.mutate(notification.id);
  };

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 transition-colors ${
        notification.isRead ? 'opacity-70' : 'bg-primary/5'
      }`}
    >
      <div className="text-xl mt-0.5 shrink-0">
        {TYPE_ICONS[notification.type] ?? '📌'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={`text-sm font-medium ${!notification.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
              {notification.title}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{notification.message}</p>
          </div>
          {!notification.isRead && (
            <div className="w-2 h-2 rounded-full bg-primary mt-1 shrink-0" />
          )}
        </div>

        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-xs text-muted-foreground">
            {formatDateTime(notification.createdAt)}
          </span>

          {notification.ticketId && (
            <Link
              href={`/tickets/${notification.ticketId}`}
              onClick={handleRead}
              className="text-xs text-primary hover:underline"
            >
              View ticket →
            </Link>
          )}

          {!notification.isRead && (
            <button
              onClick={handleRead}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Mark read
            </button>
          )}

          <button
            onClick={() => deleteNotif.mutate(notification.id)}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors ml-auto"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export function NotificationsList() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useNotifications({ page, limit: 20, unreadOnly });
  const markAllRead = useMarkAllAsRead();
  const clearAll = useClearNotifications();

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => { setUnreadOnly(e.target.checked); setPage(1); }}
              className="rounded"
            />
            Unread only
          </label>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="text-sm px-3 py-1.5 border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
          >
            Mark all read
          </button>
          <button
            onClick={() => clearAll.mutate()}
            disabled={clearAll.isPending}
            className="text-sm px-3 py-1.5 border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 text-destructive border-destructive/30"
          >
            Clear read
          </button>
        </div>
      </div>

      {/* List */}
      <div className="border rounded-xl overflow-hidden bg-card">
        {isLoading ? (
          <div className="space-y-px">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse mx-4 my-2 rounded-lg" />
            ))}
          </div>
        ) : !data?.data?.length ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-2xl mb-2">🔔</p>
            <p className="font-medium">No notifications</p>
            <p className="text-sm mt-1">
              {unreadOnly ? 'No unread notifications.' : "You're all caught up!"}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {data.data.map((n) => (
              <NotificationItem key={n.id} notification={n as any} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {data && data.meta.totalPages > 1 && (
          <div className="px-4 py-3 border-t flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {data.meta.page} of {data.meta.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page <= 1}
                className="px-3 py-1 border rounded-lg hover:bg-muted disabled:opacity-40 transition-colors"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.meta.totalPages}
                className="px-3 py-1 border rounded-lg hover:bg-muted disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
