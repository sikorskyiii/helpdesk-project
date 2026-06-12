import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { EmailProcessor } from './processors/email.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { EmailModule } from '@/email/email.module';
import { EMAIL_QUEUE, NOTIFICATION_QUEUE } from './queues/notification.queue';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host', 'localhost'),
          port: configService.get<number>('redis.port', 6379),
          password: configService.get<string>('redis.password') || undefined,
          maxRetriesPerRequest: null,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 50 },
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: NOTIFICATION_QUEUE },
      { name: EMAIL_QUEUE },
    ),
    EmailModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationProcessor, EmailProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
