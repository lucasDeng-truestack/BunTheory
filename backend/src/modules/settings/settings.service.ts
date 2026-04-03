import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

  /** Safe for unauthenticated GET /settings (no admin-only fields). */
  async getPublicSettings() {
    const s = await this.getSettings();
    return {
      id: s.id,
      maxOrdersPerDay: s.maxOrdersPerDay,
      orderingEnabled: s.orderingEnabled,
      minimumDeliveryAmount: s.minimumDeliveryAmount,
      companyName: s.companyName,
      companyLogoUrl: s.companyLogoUrl,
      paymentQrUrl: s.paymentQrUrl,
      updatedAt: s.updatedAt,
    };
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

  async updateBranding(dto: {
    companyName?: string;
    companyLogoUrl?: string;
    paymentQrUrl?: string;
    adminWhatsappNumber?: string;
  }) {
    if (
      dto.companyName === undefined &&
      dto.companyLogoUrl === undefined &&
      dto.paymentQrUrl === undefined &&
      dto.adminWhatsappNumber === undefined
    ) {
      return this.getSettings();
    }
    const data: Prisma.SystemSettingsUpdateInput = {};
    if (dto.companyName !== undefined) {
      const v = dto.companyName.trim();
      data.companyName = v === '' ? null : v;
    }
    if (dto.companyLogoUrl !== undefined) {
      const v = dto.companyLogoUrl.trim();
      data.companyLogoUrl = v === '' ? null : v;
    }
    if (dto.paymentQrUrl !== undefined) {
      const v = dto.paymentQrUrl.trim();
      data.paymentQrUrl = v === '' ? null : v;
    }
    if (dto.adminWhatsappNumber !== undefined) {
      const v = dto.adminWhatsappNumber.trim();
      data.adminWhatsappNumber = v === '' ? null : v;
    }
    let settings = await this.prisma.systemSettings.findFirst({
      orderBy: { id: 'asc' },
    });
    if (!settings) {
      const createData: Prisma.SystemSettingsCreateInput = {
        maxOrdersPerDay: 15,
        orderingEnabled: true,
      };
      if (data.companyName !== undefined) {
        createData.companyName = data.companyName as string | null;
      }
      if (data.companyLogoUrl !== undefined) {
        createData.companyLogoUrl = data.companyLogoUrl as string | null;
      }
      if (data.paymentQrUrl !== undefined) {
        createData.paymentQrUrl = data.paymentQrUrl as string | null;
      }
      if (data.adminWhatsappNumber !== undefined) {
        createData.adminWhatsappNumber = data.adminWhatsappNumber as string | null;
      }
      settings = await this.prisma.systemSettings.create({
        data: createData,
      });
    } else {
      settings = await this.prisma.systemSettings.update({
        where: { id: settings.id },
        data,
      });
    }
    return settings;
  }
}
