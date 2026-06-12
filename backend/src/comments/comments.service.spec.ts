import { Test, TestingModule } from '@nestjs/testing';
import { CommentsService } from './comments.service';
import { PrismaService } from '@/database/prisma.service';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';

const mockTicket = {
  id: 'ticket-id',
  title: 'Test Ticket',
  organizationId: 'org-id',
  reporterId: 'reporter-id',
  assigneeId: 'agent-id',
};

const mockComment = {
  id: 'comment-id',
  content: 'Test comment',
  isInternal: false,
  ticketId: 'ticket-id',
  authorId: 'user-id',
  parentId: null,
  ticket: { organizationId: 'org-id' },
};

const mockPrisma = {
  ticket: { findUnique: jest.fn() },
  comment: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  commentMention: { createMany: jest.fn() },
  organizationMember: { findFirst: jest.fn() },
  notification: { create: jest.fn() },
  auditLog: { create: jest.fn() },
};

describe('CommentsService', () => {
  let service: CommentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
    jest.clearAllMocks();
  });

  describe('findByTicket', () => {
    it('should return public comments for customers', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrisma.organizationMember.findFirst.mockResolvedValue(null); // not agent
      mockPrisma.comment.findMany.mockResolvedValue([]);

      await service.findByTicket('ticket-id', 'customer-id');

      const whereArg = mockPrisma.comment.findMany.mock.calls[0][0].where;
      expect(whereArg.isInternal).toBe(false);
    });

    it('should include internal comments for agents', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrisma.organizationMember.findFirst.mockResolvedValue({ role: { name: 'AGENT' } });
      mockPrisma.comment.findMany.mockResolvedValue([]);

      await service.findByTicket('ticket-id', 'agent-id');

      const whereArg = mockPrisma.comment.findMany.mock.calls[0][0].where;
      expect(whereArg.isInternal).toBeUndefined();
    });

    it('should throw NotFoundException for unknown ticket', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(null);
      await expect(service.findByTicket('bad-id', 'user-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a public comment', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrisma.organizationMember.findFirst.mockResolvedValue({ id: 'm1' });
      mockPrisma.comment.create.mockResolvedValue({ ...mockComment, author: {}, mentions: [], replies: [] });
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockPrisma.notification.create.mockResolvedValue({});

      const result = await service.create('ticket-id', 'user-id', {
        content: 'Test comment',
        isInternal: false,
      });

      expect(result.content).toBe('Test comment');
    });

    it('should throw ForbiddenException when customer tries to post internal comment', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(mockTicket);
      // assertTicketMember passes (is member)
      mockPrisma.organizationMember.findFirst
        .mockResolvedValueOnce({ id: 'm1', role: { name: 'CUSTOMER' } }) // assertTicketMember
        .mockResolvedValueOnce(null); // isAgentOrAdmin check

      await expect(
        service.create('ticket-id', 'customer-id', { content: 'Secret note', isInternal: true }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid parentId', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrisma.organizationMember.findFirst.mockResolvedValue({ id: 'm1' });
      mockPrisma.comment.findUnique.mockResolvedValue(null);

      await expect(
        service.create('ticket-id', 'user-id', {
          content: 'Reply',
          parentId: 'non-existent-parent',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create mention notifications', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrisma.organizationMember.findFirst.mockResolvedValue({ id: 'm1' });
      mockPrisma.comment.create.mockResolvedValue({ ...mockComment, id: 'new-comment', author: {}, mentions: [], replies: [] });
      mockPrisma.commentMention.createMany.mockResolvedValue({});
      mockPrisma.notification.create.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.create('ticket-id', 'user-id', {
        content: 'Hey @other-user',
        mentionedUserIds: ['other-user-id'],
      });

      expect(mockPrisma.commentMention.createMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('should update own comment', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue(mockComment);
      mockPrisma.comment.update.mockResolvedValue({
        ...mockComment,
        content: 'Updated',
        isEdited: true,
        author: {},
        mentions: [],
        replies: [],
      });

      const result = await service.update('comment-id', 'user-id', { content: 'Updated' });
      expect(result.isEdited).toBe(true);
    });

    it('should throw ForbiddenException when editing another user comment', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue({ ...mockComment, authorId: 'other-user' });

      await expect(
        service.update('comment-id', 'user-id', { content: 'Hack' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete own comment', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue(mockComment);
      mockPrisma.organizationMember.findFirst.mockResolvedValue(null);
      mockPrisma.comment.delete.mockResolvedValue({});

      const result = await service.remove('comment-id', 'user-id');
      expect(result.message).toBe('Comment deleted');
    });

    it('should allow admin to delete any comment', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue({ ...mockComment, authorId: 'other-user' });
      mockPrisma.organizationMember.findFirst.mockResolvedValue({ role: { name: 'ORG_ADMIN' } });
      mockPrisma.comment.delete.mockResolvedValue({});

      const result = await service.remove('comment-id', 'admin-id');
      expect(result.message).toBe('Comment deleted');
    });
  });
});
