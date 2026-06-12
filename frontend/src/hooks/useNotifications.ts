'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { notificationsApi } from '@/api/notifications.api';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (params?: object) => [...notificationKeys.all, 'list', params] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
};

export function useNotifications(params?: { page?: number; limit?: number; unreadOnly?: boolean }) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => notificationsApi.getAll(params),
    refetchInterval: 30_000, // poll every 30s
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: notificationsApi.getUnreadCount,
    refetchInterval: 15_000, // poll every 15s for badge
    staleTime: 0,
  });
}

export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
      toast.success(res.message);
    },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useClearNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.clearAll,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
      toast.success(`Cleared ${res.deleted} notifications`);
    },
  });
}
