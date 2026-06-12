'use client';

import { useState } from 'react';
import { useComments, useCreateComment, useUpdateComment, useDeleteComment } from '@/hooks/useComments';
import { useAuthStore } from '@/stores/auth.store';
import { getInitials, formatDateTime } from '@/lib/utils';
import type { Comment } from '@/types';

function CommentItem({
  comment,
  ticketId,
  onReply,
}: {
  comment: Comment & { replies?: Comment[]; author: any; mentions?: any[] };
  ticketId: string;
  onReply: (parentId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const currentUser = useAuthStore((s) => s.user);
  const updateComment = useUpdateComment(ticketId);
  const deleteComment = useDeleteComment(ticketId);

  const isOwner = currentUser?.id === comment.authorId;

  const handleSaveEdit = () => {
    if (!editContent.trim()) return;
    updateComment.mutate(
      { commentId: comment.id, content: editContent },
      { onSuccess: () => setEditing(false) },
    );
  };

  return (
    <div className={`flex gap-3 ${comment.isInternal ? 'opacity-90' : ''}`}>
      <div className="shrink-0">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
          {getInitials(comment.author.firstName, comment.author.lastName)}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">
            {comment.author.firstName} {comment.author.lastName}
          </span>
          {comment.isInternal && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 font-medium">
              Internal
            </span>
          )}
          {comment.isEdited && (
            <span className="text-xs text-muted-foreground">(edited)</span>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {formatDateTime(comment.createdAt)}
          </span>
        </div>

        {editing ? (
          <div className="mt-2 space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                disabled={updateComment.isPending}
                className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {updateComment.isPending ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => { setEditing(false); setEditContent(comment.content); }}
                className="text-xs border px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">{comment.content}</p>
        )}

        <div className="flex gap-3 mt-2">
          <button
            onClick={() => onReply(comment.id)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Reply
          </button>
          {isOwner && !editing && (
            <>
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => deleteComment.mutate(comment.id)}
                className="text-xs text-destructive hover:text-destructive/80 transition-colors"
              >
                Delete
              </button>
            </>
          )}
        </div>

        {/* Nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 pl-4 border-l-2 border-muted space-y-4">
            {comment.replies.map((reply: any) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                ticketId={ticketId}
                onReply={onReply}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function CommentsSection({ ticketId, isAgent = false }: { ticketId: string; isAgent?: boolean }) {
  const { data: comments, isLoading } = useComments(ticketId);
  const createComment = useCreateComment(ticketId);

  const [content, setContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [replyToId, setReplyToId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    // Parse @mentions from content: @[name](userId) pattern
    const mentionPattern = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentionedUserIds: string[] = [];
    let match;
    while ((match = mentionPattern.exec(content)) !== null) {
      mentionedUserIds.push(match[2]);
    }

    createComment.mutate(
      {
        content: content.trim(),
        isInternal,
        parentId: replyToId ?? undefined,
        mentionedUserIds: mentionedUserIds.length ? mentionedUserIds : undefined,
      },
      {
        onSuccess: () => {
          setContent('');
          setReplyToId(null);
          setIsInternal(false);
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          Comments {comments?.length ? `(${comments.length})` : ''}
        </h3>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : !comments?.length ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No comments yet. Be the first to comment.
        </p>
      ) : (
        <div className="space-y-5">
          {comments.map((c: any) => (
            <CommentItem
              key={c.id}
              comment={c}
              ticketId={ticketId}
              onReply={(parentId) => {
                setReplyToId(parentId);
                document.getElementById('comment-input')?.focus();
              }}
            />
          ))}
        </div>
      )}

      {/* Compose */}
      <form onSubmit={handleSubmit} className="border rounded-xl p-4 bg-card space-y-3">
        {replyToId && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">
            <span>Replying to comment</span>
            <button
              type="button"
              onClick={() => setReplyToId(null)}
              className="ml-auto hover:text-foreground transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        <textarea
          id="comment-input"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={isInternal ? 'Internal note (only visible to agents)...' : 'Write a comment...'}
          rows={3}
          className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />

        <div className="flex items-center justify-between">
          {isAgent && (
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="rounded"
              />
              <span className="text-muted-foreground">Internal note</span>
            </label>
          )}

          <button
            type="submit"
            disabled={createComment.isPending || !content.trim()}
            className="ml-auto bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {createComment.isPending ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </form>
    </div>
  );
}
