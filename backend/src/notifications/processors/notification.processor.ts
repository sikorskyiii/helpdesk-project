import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { NOTIFICATION_QUEUE, InAppJobData } from '../queues/notification.queue';

@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<InAppJobData>): Promise<void> {
    this.logger.log(`Processing notification job: ${job.name} [${job.id}]`);

    try {
      await this.prisma.notification.create({
        data: {
          type: job.data.type as any,
          title: job.data.title,
          message: job.data.message,
          userId: job.data.userId,
          ticketId: job.data.ticketId ?? null,
          metadata: job.data.metadata ?? {},
        },
      });

      this.logger.log(`Notification created for user: ${job.data.userId}`);
    } catch (error) {
      this.logger.error(`Notification job failed: ${job.name} [${job.id}]`, error);
      throw error;
    }
  }
}
