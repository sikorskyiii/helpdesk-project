import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { EmailService } from '@/email/email.service';
import { EMAIL_QUEUE, EmailJobData } from '../queues/notification.queue';

@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job<EmailJobData>): Promise<void> {
    this.logger.log(`Processing email job: ${job.name} [${job.id}]`);

    try {
      // EmailService.send is private, so we use a dedicated public method
      // based on job type, we dispatch to the right email template
      switch (job.name) {
        case 'ticket-assigned':
          await this.emailService.sendTicketAssigned(
            job.data.to,
            job.data.metadata?.userName ?? '',
            job.data.metadata?.ticketTitle ?? '',
            job.data.metadata?.ticketId ?? '',
          );
          break;

        case 'new-comment':
          await this.emailService.sendNewComment(
            job.data.to,
            job.data.metadata?.userName ?? '',
            job.data.metadata?.ticketTitle ?? '',
            job.data.metadata?.ticketId ?? '',
            job.data.metadata?.commenterName ?? '',
          );
          break;

        case 'status-changed':
          await this.emailService.sendStatusChanged(
            job.data.to,
            job.data.metadata?.userName ?? '',
            job.data.metadata?.ticketTitle ?? '',
            job.data.metadata?.ticketId ?? '',
            job.data.metadata?.newStatus ?? '',
          );
          break;

        case 'mentioned':
          await this.emailService.sendMentioned(
            job.data.to,
            job.data.metadata?.userName ?? '',
            job.data.metadata?.ticketTitle ?? '',
            job.data.metadata?.ticketId ?? '',
            job.data.metadata?.mentionedBy ?? '',
          );
          break;

        default:
          this.logger.warn(`Unknown email job type: ${job.name}`);
      }

      this.logger.log(`Email job completed: ${job.name} [${job.id}]`);
    } catch (error) {
      this.logger.error(`Email job failed: ${job.name} [${job.id}]`, error);
      throw error; // BullMQ will retry based on job options
    }
  }
}
