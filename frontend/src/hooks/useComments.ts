'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { commentsApi, CreateCommentPayload } from '@/api/comments.api';

export const commentKeys = {
  byTicket: (ticketId: string) => ['comments', ticketId] as const,
};

export function useComments(ticketId: string) {
  return useQuery({
    queryKey: commentKeys.byTicket(ticketId),
    queryFn: () => commentsApi.getByTicket(ticketId),
    enabled: !!ticketId,
  });
}

export function useCreateComment(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCommentPayload) => commentsApi.create(ticketId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commentKeys.byTicket(ticketId) });
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to post comment'),
  });
}

export function useUpdateComment(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      commentsApi.update(ticketId, commentId, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commentKeys.byTicket(ticketId) });
      toast.success('Comment updated');
    },
    onError: (err: any) => toast.error(err?.message || 'Update failed'),
  });
}

export function useDeleteComment(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => commentsApi.delete(ticketId, commentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commentKeys.byTicket(ticketId) });
      toast.success('Comment deleted');
    },
    onError: (err: any) => toast.error(err?.message || 'Delete failed'),
  });
}
