import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@/database/prisma.service';
import { paginate } from '@/common/dto/pagination.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import {
  EMAIL_QUEUE,
  NOTIFICATION_QUEUE,
  NotificationJobType,
} from './queues/notification.queue';

export interface DispatchNotificationPayload {
  type: string;
  title: string;
  message: string;
  userId: string;
  ticketId?: string;
  metadata?: Record<string, any>;
  // Email options
  sendEmail?: boolean;
  emailTo?: string;
  emailJobName?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(NOTIFICATION_QUEUE) private readonly notifQueue: Queue,
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue,
  ) {}

  // ─── Dispatch (called by other services) ──────────────────────────────────

  async dispatch(payload: DispatchNotificationPayload): Promise<void> {
    // 1. Queue in-app notification
    await this.notifQueue.add(
      NotificationJobType.CREATE_IN_APP,
      {
        type: payload.type,
        title: payload.title,
        message: payload.message,
        userId: payload.userId,
        ticketId: payload.ticketId,
        metadata: payload.metadata,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );

    // 2. Queue email if requested
    if (payload.sendEmail && payload.emailTo && payload.emailJobName) {
      await this.emailQueue.add(
        payload.emailJobName,
        {
          to: payload.emailTo,
          metadata: payload.metadata,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 100,
          removeOnFail: 50,
          // Delay emails slightly to batch rapid changes
          delay: 2000,
        },
      );
    }
  }

  // ─── Get user notifications ────────────────────────────────────────────────

  async findForUser(userId: string, query: QueryNotificationDto) {
    const { page = 1, limit = 20, unreadOnly } = query;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (unreadOnly) where.isRead = false;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          ticket: { select: { id: true, title: true, status: true } },
        },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return paginate(notifications, total, page, limit);
  }

  // ─── Unread count ──────────────────────────────────────────────────────────

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  // ─── Mark as read ─────────────────────────────────────────────────────────

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    const { count } = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { updated: count, message: `${count} notifications marked as read` };
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  async remove(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    await this.prisma.notification.delete({ where: { id: notificationId } });
    return { message: 'Notification deleted' };
  }

  async clearAll(userId: string) {
    const { count } = await this.prisma.notification.deleteMany({
      where: { userId, isRead: true },
    });
    return { deleted: count };
  }

  // ─── Queue stats (for monitoring) ─────────────────────────────────────────

  async getQueueStats() {
    const [
      notifWaiting,
      notifActive,
      notifFailed,
      emailWaiting,
      emailActive,
      emailFailed,
    ] = await Promise.all([
      this.notifQueue.getWaitingCount(),
      this.notifQueue.getActiveCount(),
      this.notifQueue.getFailedCount(),
      this.emailQueue.getWaitingCount(),
      this.emailQueue.getActiveCount(),
      this.emailQueue.getFailedCount(),
    ]);

    return {
      notifications: { waiting: notifWaiting, active: notifActive, failed: notifFailed },
      emails: { waiting: emailWaiting, active: emailActive, failed: emailFailed },
    };
  }
}
