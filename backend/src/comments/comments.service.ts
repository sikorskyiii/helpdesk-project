import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { RoleName } from '@prisma/client';

const COMMENT_INCLUDE = {
  author: {
    select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
  },
  mentions: {
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  replies: {
    include: {
      author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      mentions: {
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
};

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Get ticket comments ───────────────────────────────────────────────────

  async findByTicket(ticketId: string, userId: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const isAgent = await this.isAgentOrAdmin(ticket.organizationId, userId);

    const where: any = {
      ticketId,
      parentId: null, // top-level only; replies loaded via include
    };

    // Customers cannot see internal comments
    if (!isAgent) {
      where.isInternal = false;
    }

    return this.prisma.comment.findMany({
      where,
      include: COMMENT_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(ticketId: string, userId: string, dto: CreateCommentDto) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    await this.assertTicketMember(ticket.organizationId, userId);

    // Only agents/admins can post internal comments
    if (dto.isInternal) {
      const canInternal = await this.isAgentOrAdmin(ticket.organizationId, userId);
      if (!canInternal) {
        throw new ForbiddenException('Only agents and admins can post internal comments');
      }
    }

    // Validate parent comment belongs to same ticket
    if (dto.parentId) {
      const parent = await this.prisma.comment.findUnique({ where: { id: dto.parentId } });
      if (!parent || parent.ticketId !== ticketId) {
        throw new BadRequestException('Parent comment not found or belongs to a different ticket');
      }
    }

    const comment = await this.prisma.comment.create({
      data: {
        content: dto.content,
        isInternal: dto.isInternal ?? false,
        ticketId,
        authorId: userId,
        parentId: dto.parentId ?? null,
      },
      include: COMMENT_INCLUDE,
    });

    // Handle @mentions
    if (dto.mentionedUserIds?.length) {
      const uniqueIds = [...new Set(dto.mentionedUserIds)].filter((id) => id !== userId);

      if (uniqueIds.length) {
        await this.prisma.commentMention.createMany({
          data: uniqueIds.map((uid) => ({ commentId: comment.id, userId: uid })),
          skipDuplicates: true,
        });

        // Notify mentioned users
        for (const mentionedUserId of uniqueIds) {
          await this.prisma.notification.create({
            data: {
              type: 'MENTIONED',
              title: 'You were mentioned in a comment',
              message: `You were mentioned in a comment on ticket: "${ticket.title}"`,
              userId: mentionedUserId,
              ticketId,
              metadata: { commentId: comment.id, mentionedBy: userId },
            },
          });
        }
      }
    }

    // Notify ticket reporter and assignee (excluding the commenter)
    const notifyUsers = new Set<string>([ticket.reporterId]);
    if (ticket.assigneeId) notifyUsers.add(ticket.assigneeId);
    notifyUsers.delete(userId);

    for (const notifyUserId of notifyUsers) {
      // Skip internal comment notifications for non-agents
      if (dto.isInternal) {
        const canSeeInternal = await this.isAgentOrAdmin(ticket.organizationId, notifyUserId);
        if (!canSeeInternal) continue;
      }

      await this.prisma.notification.create({
        data: {
          type: 'NEW_COMMENT',
          title: 'New comment on your ticket',
          message: `New comment on ticket: "${ticket.title}"`,
          userId: notifyUserId,
          ticketId,
          metadata: { commentId: comment.id, authorId: userId },
        },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        action: 'COMMENT_CREATED',
        entityType: 'comment',
        entityId: comment.id,
        newValues: { ticketId, isInternal: comment.isInternal },
        userId,
      },
    });

    return comment;
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async update(commentId: string, userId: string, dto: UpdateCommentDto) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { ticket: { select: { organizationId: true } } },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    return this.prisma.comment.update({
      where: { id: commentId },
      data: {
        content: dto.content,
        isEdited: true,
        editedAt: new Date(),
      },
      include: COMMENT_INCLUDE,
    });
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  async remove(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { ticket: { select: { organizationId: true } } },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    const isAdmin = await this.isAgentOrAdmin(comment.ticket.organizationId, userId);

    if (comment.authorId !== userId && !isAdmin) {
      throw new ForbiddenException('You do not have permission to delete this comment');
    }

    await this.prisma.comment.delete({ where: { id: commentId } });

    return { message: 'Comment deleted' };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async assertTicketMember(orgId: string, userId: string) {
    const superAdmin = await this.prisma.organizationMember.findFirst({
      where: { userId, isActive: true, role: { name: RoleName.SUPER_ADMIN } },
    });
    if (superAdmin) return;

    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId: orgId, userId, isActive: true },
    });
    if (!member) throw new ForbiddenException('You are not a member of this organization');
  }

  private async isAgentOrAdmin(orgId: string, userId: string): Promise<boolean> {
    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        userId,
        isActive: true,
        role: {
          name: { in: [RoleName.ORG_ADMIN, RoleName.SUPER_ADMIN, RoleName.AGENT] },
        },
        OR: [{ organizationId: orgId }, {}],
      },
    });
    return !!membership;
  }
}
