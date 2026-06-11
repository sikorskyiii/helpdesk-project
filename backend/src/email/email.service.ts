import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('email.host'),
      port: this.configService.get('email.port'),
      secure: this.configService.get('email.secure'),
      auth: {
        user: this.configService.get('email.user'),
        pass: this.configService.get('email.pass'),
      },
    });
  }

  async sendEmailVerification(to: string, token: string, name: string): Promise<void> {
    const frontendUrl = this.configService.get('app.frontendUrl');
    const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;

    await this.send({
      to,
      subject: 'Verify your HelpDesk email',
      html: `
        <h2>Hello, ${name}!</h2>
        <p>Please verify your email address by clicking the button below:</p>
        <a href="${verifyUrl}" style="background:#3b82f6;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
          Verify Email
        </a>
        <p>This link expires in 24 hours.</p>
        <p>If you did not create an account, you can safely ignore this email.</p>
      `,
    });
  }

  async sendPasswordReset(to: string, token: string, name: string): Promise<void> {
    const frontendUrl = this.configService.get('app.frontendUrl');
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    await this.send({
      to,
      subject: 'Reset your HelpDesk password',
      html: `
        <h2>Hello, ${name}!</h2>
        <p>You requested a password reset. Click the button below to set a new password:</p>
        <a href="${resetUrl}" style="background:#3b82f6;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
          Reset Password
        </a>
        <p>This link expires in 1 hour.</p>
        <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
      `,
    });
  }

  async sendTicketAssigned(to: string, name: string, ticketTitle: string, ticketId: string): Promise<void> {
    const frontendUrl = this.configService.get('app.frontendUrl');
    const ticketUrl = `${frontendUrl}/tickets/${ticketId}`;

    await this.send({
      to,
      subject: `Ticket assigned to you: ${ticketTitle}`,
      html: `
        <h2>Hello, ${name}!</h2>
        <p>A ticket has been assigned to you:</p>
        <p><strong>${ticketTitle}</strong></p>
        <a href="${ticketUrl}" style="background:#3b82f6;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
          View Ticket
        </a>
      `,
    });
  }

  async sendNewComment(to: string, name: string, ticketTitle: string, ticketId: string, commenterName: string): Promise<void> {
    const frontendUrl = this.configService.get('app.frontendUrl');
    const ticketUrl = `${frontendUrl}/tickets/${ticketId}`;

    await this.send({
      to,
      subject: `New comment on: ${ticketTitle}`,
      html: `
        <h2>Hello, ${name}!</h2>
        <p><strong>${commenterName}</strong> left a comment on ticket:</p>
        <p><strong>${ticketTitle}</strong></p>
        <a href="${ticketUrl}" style="background:#3b82f6;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
          View Ticket
        </a>
      `,
    });
  }

  private async send(options: { to: string; subject: string; html: string }): Promise<void> {
    const from = this.configService.get('email.from');

    try {
      await this.transporter.sendMail({ from, ...options });
      this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}`, error);
    }
  }
}
