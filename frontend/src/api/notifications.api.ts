import { api } from '@/lib/axios';
import type { Notification, PaginatedResult } from '@/types';

export const notificationsApi = {
  getAll: (params?: { page?: number; limit?: number; unreadOnly?: boolean }): Promise<PaginatedResult<Notification>> =>
    api.get('/notifications', { params }),

  getUnreadCount: (): Promise<{ count: number }> =>
    api.get('/notifications/unread-count'),

  markAsRead: (id: string): Promise<Notification> =>
    api.patch(`/notifications/${id}/read`),

  markAllAsRead: (): Promise<{ updated: number; message: string }> =>
    api.patch('/notifications/read-all'),

  delete: (id: string) =>
    api.delete(`/notifications/${id}`),

  clearAll: (): Promise<{ deleted: number }> =>
    api.delete('/notifications/clear'),
};
