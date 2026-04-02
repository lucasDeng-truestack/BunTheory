import { Injectable, Logger } from '@nestjs/common';
import * as twilio from 'twilio';
import { Order } from '@prisma/client';

type OrderWithItems = Order & {
  orderItems: Array<{
    quantity: number;
    menu: { name: string } | null;
    remarks: string | null;
    selectedOptions: unknown;
  }>;
};

/** Build Twilio WhatsApp address: whatsapp:+E164 */
function toWhatsAppAddress(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  if (lower.startsWith('whatsapp:')) {
    const rest = trimmed.slice('whatsapp:'.length).replace(/\s/g, '');
    if (!rest) return null;
    const withPlus = rest.startsWith('+') ? rest : `+${rest.replace(/^\+/, '')}`;
    return `whatsapp:${withPlus}`;
  }

  const digits = trimmed.replace(/[^\d+]/g, '');
  if (!digits) return null;
  const e164 = digits.startsWith('+') ? digits : `+${digits}`;
  if (e164.replace(/\D/g, '').length < 8) return null;
  return `whatsapp:${e164}`;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private client: twilio.Twilio | null = null;
  private from: string;
  private adminNumber: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
    const apiKeySid = process.env.TWILIO_API_KEY_SID?.trim();
    const apiKeySecret = process.env.TWILIO_API_KEY_SECRET?.trim();
    this.from = process.env.TWILIO_WHATSAPP_FROM?.trim() || '';
    this.adminNumber = process.env.ADMIN_WHATSAPP_NUMBER?.trim() || '';

    if (accountSid && apiKeySid && apiKeySecret) {
      this.client = twilio(apiKeySid, apiKeySecret, { accountSid });
    } else if (accountSid && authToken) {
      this.client = twilio(accountSid, authToken);
    }
  }

  private async sendWhatsApp(toRaw: string, body: string, context?: string) {
    const to = toWhatsAppAddress(toRaw);
    if (!to) {
      this.logger.warn(
        `WhatsApp skipped — invalid phone (${context ?? 'unknown'}): "${toRaw}"`,
      );
      return;
    }
    if (!this.client || !this.from) {
      this.logger.log(`WhatsApp skipped (not configured)${context ? ` [${context}]` : ''}`);
      return;
    }
    try {
      await this.client.messages.create({
        from: this.from,
        to,
        body,
      });
      this.logger.log(`WhatsApp sent${context ? ` [${context}]` : ''} → ${to}`);
    } catch (err) {
      this.logger.error(
        `WhatsApp failed${context ? ` [${context}]` : ''}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  formatItems(order: OrderWithItems): string {
    return order.orderItems
      .map((i) => {
        const name = i.menu?.name ?? 'Item';
        const snap = i.selectedOptions as { summary?: string[] } | null;
        let line = `${i.quantity}x ${name}`;
        if (snap?.summary?.length) {
          line += ` (${snap.summary.join('; ')})`;
        }
        if (i.remarks?.trim()) {
          line += ` — Note: ${i.remarks.trim()}`;
        }
        return line;
      })
      .join('\n');
  }

  async notifyAdminNewOrder(order: OrderWithItems) {
    if (!this.adminNumber) {
      this.logger.warn(
        'WhatsApp admin alert skipped — set ADMIN_WHATSAPP_NUMBER in .env',
      );
      return;
    }
    const items = this.formatItems(order);
    const typeLabel = order.type === 'PICKUP' ? 'Pickup' : 'Delivery';
    const body = `🍔 Bun Theory

New Order!

Order: ${order.slugId}
Customer: ${order.customerName}
Phone: ${order.phone}
Type: ${typeLabel}

Items:
${items}`;

    await this.sendWhatsApp(this.adminNumber, body, `admin new order ${order.slugId}`);
  }

  async notifyCustomerOrderReceived(order: OrderWithItems) {
    const body = `🍔 Bun Theory by Bakar & Roast

Your order has been received!

Order: ${order.slugId}
Status: Received

We'll notify you when it's ready.`;
    await this.sendWhatsApp(order.phone, body, `customer received ${order.slugId}`);
  }

  async notifyCustomerPreparing(order: OrderWithItems) {
    const body = `🍔 Bun Theory by Bakar & Roast

Your order is now being prepared!

Order: ${order.slugId}
Status: Preparing`;
    await this.sendWhatsApp(order.phone, body, `customer preparing ${order.slugId}`);
  }

  async notifyCustomerReady(order: OrderWithItems) {
    const line =
      order.type === 'DELIVERY'
        ? `Your order is out for delivery — it will arrive soon!`
        : `Your order is ready for pickup!`;
    const body = `🍔 Bun Theory by Bakar & Roast

${line}

Order: ${order.slugId}
Status: Ready`;
    await this.sendWhatsApp(order.phone, body, `customer ready ${order.slugId}`);
  }

  async notifyCustomerDelivered(order: OrderWithItems) {
    const body = `🍔 Bun Theory by Bakar & Roast

Your order has been delivered. Enjoy! 🎉

Order: ${order.slugId}
Status: Delivered`;
    await this.sendWhatsApp(order.phone, body, `customer delivered ${order.slugId}`);
  }
}
