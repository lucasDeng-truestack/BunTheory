import { Injectable, Logger } from '@nestjs/common';
import { CateringBooking } from '@prisma/client';
import { Resend } from 'resend';
import { PrismaService } from '../../prisma/prisma.service';
import {
  EmailContent,
  bookingApprovedEmail,
  bookingCancelledEmail,
  bookingDeclinedEmail,
  bookingExpiredEmail,
  bookingReceivedEmail,
  ownerCustomerCancelledEmail,
  ownerNewRequestEmail,
  ownerReceiptUploadedEmail,
  signInCodeEmail,
} from './email.templates';

type Builder = (b: CateringBooking, site: string) => EmailContent;

/** Transactional emails (catering, sign-in codes) via Resend. Never throws to the caller. */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;
  private readonly siteUrl: string;

  constructor(private readonly prisma: PrismaService) {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.from =
      process.env.EMAIL_FROM?.trim() || 'Bakar & Roast <onboarding@resend.dev>';
    this.siteUrl = (
      process.env.PUBLIC_SITE_URL?.trim() || 'http://localhost:3200'
    ).replace(/\/+$/, '');
    if (!this.resend) {
      this.logger.log('Email disabled (RESEND_API_KEY not set)');
    }
  }

  bookingReceived(booking: CateringBooking): Promise<void> {
    return this.toCustomer('bookingReceived', booking, bookingReceivedEmail);
  }

  ownerNewRequest(booking: CateringBooking): Promise<void> {
    return this.toOwner('ownerNewRequest', booking, ownerNewRequestEmail);
  }

  ownerReceiptUploaded(booking: CateringBooking): Promise<void> {
    return this.toOwner('ownerReceiptUploaded', booking, ownerReceiptUploadedEmail);
  }

  bookingApproved(booking: CateringBooking): Promise<void> {
    return this.toCustomer('bookingApproved', booking, bookingApprovedEmail);
  }

  bookingDeclined(booking: CateringBooking): Promise<void> {
    return this.toCustomer('bookingDeclined', booking, bookingDeclinedEmail);
  }

  bookingCancelled(booking: CateringBooking): Promise<void> {
    return this.toCustomer('bookingCancelled', booking, bookingCancelledEmail);
  }

  bookingExpired(booking: CateringBooking): Promise<void> {
    return this.toCustomer('bookingExpired', booking, bookingExpiredEmail);
  }

  ownerCustomerCancelled(booking: CateringBooking): Promise<void> {
    return this.toOwner(
      'ownerCustomerCancelled',
      booking,
      ownerCustomerCancelledEmail,
    );
  }

  /** Better Auth email OTP. The code is only ever logged outside production with no Resend key. */
  async signInCode(email: string, otp: string, type: string): Promise<void> {
    const ctx = `[signInCode ${type}]`;
    try {
      if (!this.resend) {
        if (process.env.NODE_ENV !== 'production') {
          this.logger.log(`Email skipped (not configured) ${ctx} dev code for ${email}: ${otp}`);
        } else {
          this.logger.log(`Email skipped (not configured) ${ctx}`);
        }
        return;
      }
      const { subject, html, text } = signInCodeEmail(otp);
      const { error } = await this.resend.emails.send({
        from: this.from,
        to: email,
        subject,
        html,
        text,
      });
      if (error) {
        this.logger.error(`Email failed ${ctx}: ${error.name} ${error.message}`);
      }
    } catch (err) {
      this.logger.error(
        `Email failed ${ctx}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private toCustomer(
    kind: string,
    booking: CateringBooking,
    build: Builder,
  ): Promise<void> {
    return this.send(kind, booking, async () => booking.customerEmail, build);
  }

  private toOwner(
    kind: string,
    booking: CateringBooking,
    build: Builder,
  ): Promise<void> {
    return this.send(
      kind,
      booking,
      async () => {
        const row = await this.prisma.systemSettings.findFirst({
          orderBy: { id: 'asc' },
          select: { cateringNotifyEmail: true },
        });
        const configured = row?.cateringNotifyEmail?.trim();
        if (configured) return configured;
        // Fresh deploys have no notify address yet: tell the owners rather than nobody.
        const owners = await this.prisma.user.findMany({
          where: { role: 'OWNER' },
          orderBy: { createdAt: 'asc' },
          take: 5,
          select: { email: true },
        });
        if (owners.length === 0) return null;
        this.logger.warn(
          `cateringNotifyEmail not set; sending ${kind} [${booking.reference}] to ${owners.length} OWNER account(s)`,
        );
        return owners.map((o) => o.email);
      },
      build,
    );
  }

  private async send(
    kind: string,
    booking: CateringBooking,
    resolveTo: () => Promise<string | string[] | null | undefined>,
    build: Builder,
  ): Promise<void> {
    const ctx = `[${kind} ${booking.reference}]`;
    try {
      if (!this.resend) {
        this.logger.log(`Email skipped (not configured) ${ctx}`);
        return;
      }
      const resolved = await resolveTo();
      const to = (Array.isArray(resolved) ? resolved : [resolved ?? ''])
        .map((x) => x.trim())
        .filter(Boolean);
      if (to.length === 0) {
        this.logger.log(`Email skipped (no recipient address) ${ctx}`);
        return;
      }
      const { subject, html, text } = build(booking, this.siteUrl);
      const { error } = await this.resend.emails.send({
        from: this.from,
        to,
        subject,
        html,
        text,
      });
      if (error) {
        this.logger.error(
          `Email failed ${ctx}: ${error.name} ${error.message}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Email failed ${ctx}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
