import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export const NOTIFICATION_QUEUE = 'notifications';
export const EMAIL_QUEUE = 'emails';

export enum NotificationJobType {
  SEND_EMAIL = 'send-email',
  CREATE_IN_APP = 'create-in-app',
  TICKET_ASSIGNED = 'ticket-assigned',
  STATUS_CHANGED = 'status-changed',
  NEW_COMMENT = 'new-comment',
  MENTIONED = 'mentioned',
}

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  type: string;
}

export interface InAppJobData {
  userId: string;
  type: string;
  title: string;
  message: string;
  ticketId?: string;
  metadata?: Record<string, any>;
}

export const createRedisConnection = (config: {
  host: string;
  port: number;
  password?: string;
}) =>
  new IORedis({
    host: config.host,
    port: config.port,
    password: config.password,
    maxRetriesPerRequest: null,
  });
