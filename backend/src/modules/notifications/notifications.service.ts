import { Injectable } from '@nestjs/common';
import * as twilio from 'twilio';
import { Order } from '@prisma/client';

type OrderWithItems = Order & {
  orderItems: Array<{
    quantity: number;
    menu: { name: string };
  }>;
};

@Injectable()
export class NotificationsService {
  private client: twilio.Twilio | null = null;
  private from: string;
  private adminNumber: string;

  constructor() {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    this.from = process.env.TWILIO_WHATSAPP_FROM || '';
    this.adminNumber = process.env.ADMIN_WHATSAPP_NUMBER || '';

    if (sid && token) {
      this.client = twilio(sid, token);
    }
  }

  private async sendWhatsApp(to: string, body: string) {
    if (!this.client || !this.from) {
      console.log('[WhatsApp] Skipped (not configured):', body);
      return;
    }
    try {
      await this.client.messages.create({
        from: this.from,
        to: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
        body,
      });
    } catch (err) {
      console.error('[WhatsApp] Error:', err);
    }
  }

  formatItems(order: OrderWithItems): string {
    return order.orderItems
      .map((i) => `${i.quantity}x ${i.menu.name}`)
      .join('\n');
  }

  async notifyAdminNewOrder(order: OrderWithItems) {
    const items = this.formatItems(order);
    const typeLabel = order.type === 'PICKUP' ? 'Pickup' : 'Delivery';
    const body = `🍔 Bun Theory

New Order!

Customer: ${order.customerName}
Phone: ${order.phone}
Type: ${typeLabel}

Items:
${items}

Order ID: ${order.id}`;

    await this.sendWhatsApp(this.adminNumber, body);
  }

  async notifyCustomerOrderReceived(order: OrderWithItems) {
    const body = `🍔 Bun Theory by Bakar & Roast

Your order has been received!

Order ID: ${order.id}
Status: Received

We'll notify you when it's ready.`;
    await this.sendWhatsApp(order.phone, body);
  }

  async notifyCustomerPreparing(order: OrderWithItems) {
    const body = `🍔 Bun Theory by Bakar & Roast

Your order is now being prepared!

Order ID: ${order.id}
Status: Preparing`;
    await this.sendWhatsApp(order.phone, body);
  }

  async notifyCustomerReady(order: OrderWithItems) {
    const body = `🍔 Bun Theory by Bakar & Roast

Your order is ready for pickup!

Order ID: ${order.id}
Status: Ready`;
    await this.sendWhatsApp(order.phone, body);
  }

  async notifyCustomerDelivered(order: OrderWithItems) {
    const body = `🍔 Bun Theory by Bakar & Roast

Your order has been delivered. Enjoy! 🎉

Order ID: ${order.id}
Status: Delivered`;
    await this.sendWhatsApp(order.phone, body);
  }
}
