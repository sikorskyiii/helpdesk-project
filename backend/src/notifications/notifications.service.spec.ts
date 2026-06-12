import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '@/database/prisma.service';
import { getQueueToken } from '@nestjs/bullmq';
import { NotFoundException } from '@nestjs/common';
import { EMAIL_QUEUE, NOTIFICATION_QUEUE } from './queues/notification.queue';

const mockPrisma = {
  notification: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
};

const mockNotifQueue = {
  add: jest.fn().mockResolvedValue({ id: 'job-1' }),
  getWaitingCount: jest.fn().mockResolvedValue(0),
  getActiveCount: jest.fn().mockResolvedValue(0),
  getFailedCount: jest.fn().mockResolvedValue(0),
};

const mockEmailQueue = {
  add: jest.fn().mockResolvedValue({ id: 'job-2' }),
  getWaitingCount: jest.fn().mockResolvedValue(0),
  getActiveCount: jest.fn().mockResolvedValue(0),
  getFailedCount: jest.fn().mockResolvedValue(0),
};

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getQueueToken(NOTIFICATION_QUEUE), useValue: mockNotifQueue },
        { provide: getQueueToken(EMAIL_QUEUE), useValue: mockEmailQueue },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  describe('dispatch', () => {
    it('should enqueue in-app notification', async () => {
      await service.dispatch({
        type: 'TICKET_ASSIGNED',
        title: 'Ticket assigned',
        message: 'You have a new ticket',
        userId: 'user-id',
        ticketId: 'ticket-id',
      });

      expect(mockNotifQueue.add).toHaveBeenCalledTimes(1);
      expect(mockEmailQueue.add).not.toHaveBeenCalled();
    });

    it('should enqueue email when sendEmail is true', async () => {
      await service.dispatch({
        type: 'TICKET_ASSIGNED',
        title: 'Ticket assigned',
        message: 'You have a new ticket',
        userId: 'user-id',
        sendEmail: true,
        emailTo: 'user@test.com',
        emailJobName: 'ticket-assigned',
        metadata: { ticketId: 'ticket-id', ticketTitle: 'Bug', userName: 'John' },
      });

      expect(mockNotifQueue.add).toHaveBeenCalledTimes(1);
      expect(mockEmailQueue.add).toHaveBeenCalledTimes(1);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      mockPrisma.notification.count.mockResolvedValue(5);
      const result = await service.getUnreadCount('user-id');
      expect(result.count).toBe(5);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue({ id: 'n1', userId: 'user-id' });
      mockPrisma.notification.update.mockResolvedValue({ id: 'n1', isRead: true });

      const result = await service.markAsRead('n1', 'user-id');
      expect(result.isRead).toBe(true);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);
      await expect(service.markAsRead('bad-id', 'user-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all as read and return count', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });
      const result = await service.markAllAsRead('user-id');
      expect(result.updated).toBe(3);
    });
  });

  describe('getQueueStats', () => {
    it('should return queue stats', async () => {
      const result = await service.getQueueStats();
      expect(result).toHaveProperty('notifications');
      expect(result).toHaveProperty('emails');
      expect(result.notifications).toMatchObject({ waiting: 0, active: 0, failed: 0 });
    });
  });
});
