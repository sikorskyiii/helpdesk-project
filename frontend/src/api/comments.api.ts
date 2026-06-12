import { api } from '@/lib/axios';
import type { Comment } from '@/types';

export interface CreateCommentPayload {
  content: string;
  isInternal?: boolean;
  parentId?: string;
  mentionedUserIds?: string[];
}

export const commentsApi = {
  getByTicket: (ticketId: string): Promise<Comment[]> =>
    api.get(`/tickets/${ticketId}/comments`),

  create: (ticketId: string, data: CreateCommentPayload): Promise<Comment> =>
    api.post(`/tickets/${ticketId}/comments`, data),

  update: (ticketId: string, commentId: string, content: string): Promise<Comment> =>
    api.patch(`/tickets/${ticketId}/comments/${commentId}`, { content }),

  delete: (ticketId: string, commentId: string) =>
    api.delete(`/tickets/${ticketId}/comments/${commentId}`),
};
