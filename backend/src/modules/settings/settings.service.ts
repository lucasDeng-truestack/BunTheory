import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    let settings = await this.prisma.systemSettings.findFirst({
      orderBy: { id: 'asc' },
    });
    if (!settings) {
      settings = await this.prisma.systemSettings.create({
        data: { maxOrdersPerDay: 15, orderingEnabled: true },
      });
    }
    return settings;
  }

  async updateMaxOrders(maxOrdersPerDay: number) {
    let settings = await this.prisma.systemSettings.findFirst({
      orderBy: { id: 'asc' },
    });
    if (!settings) {
      settings = await this.prisma.systemSettings.create({
        data: { maxOrdersPerDay, orderingEnabled: true },
      });
    } else {
      settings = await this.prisma.systemSettings.update({
        where: { id: settings.id },
        data: { maxOrdersPerDay },
      });
    }
    return settings;
  }

  async toggleOrdering(orderingEnabled: boolean) {
    let settings = await this.prisma.systemSettings.findFirst({
      orderBy: { id: 'asc' },
    });
    if (!settings) {
      settings = await this.prisma.systemSettings.create({
        data: { maxOrdersPerDay: 15, orderingEnabled },
      });
    } else {
      settings = await this.prisma.systemSettings.update({
        where: { id: settings.id },
        data: { orderingEnabled },
      });
    }
    return settings;
  }

  async updateMinimumDelivery(minimumDeliveryAmount: number | null) {
    let settings = await this.prisma.systemSettings.findFirst({
      orderBy: { id: 'asc' },
    });
    if (!settings) {
      settings = await this.prisma.systemSettings.create({
        data: {
          maxOrdersPerDay: 15,
          orderingEnabled: true,
          minimumDeliveryAmount,
        },
      });
    } else {
      settings = await this.prisma.systemSettings.update({
        where: { id: settings.id },
        data: { minimumDeliveryAmount },
      });
    }
    return settings;
  }
}
