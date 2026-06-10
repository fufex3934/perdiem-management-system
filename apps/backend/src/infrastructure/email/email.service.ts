import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { AllConfig } from '../config/configuration';

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService<AllConfig, true>) {
    const emailConfig = this.configService.get('email', { infer: true });
    if (emailConfig.provider === 'smtp' && emailConfig.smtp) {
      this.transporter = nodemailer.createTransport({
        host: emailConfig.smtp.host,
        port: emailConfig.smtp.port,
        secure: emailConfig.smtp.secure,
        auth:
          emailConfig.smtp.user && emailConfig.smtp.pass
            ? { user: emailConfig.smtp.user, pass: emailConfig.smtp.pass }
            : undefined,
      });
    }
  }

  async send(options: SendEmailOptions): Promise<void> {
    const emailConfig = this.configService.get('email', { infer: true });

    if (emailConfig.provider === 'console' || !this.transporter) {
      this.logger.log(
        `[email] To: ${options.to} | Subject: ${options.subject}\n${options.text}`,
      );
      return;
    }

    await this.transporter.sendMail({
      from: emailConfig.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html ?? options.text.replace(/\n/g, '<br>'),
    });
  }

  async sendInviteEmail(input: {
    to: string;
    firstName: string;
    inviterName: string;
    acceptUrl: string;
    expiresInDays: number;
  }): Promise<void> {
    const subject = 'You have been invited to Per Diem Management';
    const text = [
      `Hi ${input.firstName},`,
      '',
      `${input.inviterName} invited you to join their organization on Per Diem Management.`,
      '',
      `Accept your invite: ${input.acceptUrl}`,
      '',
      `This link expires in ${input.expiresInDays} days.`,
      '',
      'If you did not expect this email, you can ignore it.',
    ].join('\n');

    await this.send({
      to: input.to,
      subject,
      text,
      html: `
        <p>Hi ${input.firstName},</p>
        <p><strong>${input.inviterName}</strong> invited you to join their organization on Per Diem Management.</p>
        <p><a href="${input.acceptUrl}">Accept your invite</a></p>
        <p>This link expires in ${input.expiresInDays} days.</p>
        <p style="color:#666;font-size:12px">If you did not expect this email, you can ignore it.</p>
      `,
    });
  }
}
