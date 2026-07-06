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
      minimumDeliveryAmount:
        s.minimumDeliveryAmount != null ? Number(s.minimumDeliveryAmount) : null,
      companyName: s.companyName,
      companyLogoUrl: s.companyLogoUrl,
      paymentQrUrl: s.paymentQrUrl,
      // ─── Outlet / fees / tax (storefront fulfillment header + checkout) ───
      outletName: s.outletName,
      outletAddress: s.outletAddress,
      outletHours: s.outletHours,
      prepTimeMinutes: s.prepTimeMinutes,
      deliveryFee: s.deliveryFee != null ? Number(s.deliveryFee) : null,
      processingFee: s.processingFee != null ? Number(s.processingFee) : null,
      taxRatePercent: Number(s.taxRatePercent),
      deliveryRadiusNote: s.deliveryRadiusNote,
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

  /** Single-outlet config (name/address/hours, prep ETA, fees, tax, radius note). */
  async updateOutlet(dto: {
    outletName?: string;
    outletAddress?: string;
    outletHours?: Record<string, unknown> | null;
    prepTimeMinutes?: number | null;
    deliveryFee?: number | null;
    processingFee?: number | null;
    taxRatePercent?: number;
    deliveryRadiusNote?: string;
  }) {
    const data: Prisma.SystemSettingsUpdateInput = {};
    const trimOrNull = (v?: string) => {
      if (v === undefined) return undefined;
      const t = v.trim();
      return t === '' ? null : t;
    };

    if (dto.outletName !== undefined) data.outletName = trimOrNull(dto.outletName);
    if (dto.outletAddress !== undefined)
      data.outletAddress = trimOrNull(dto.outletAddress);
    if (dto.outletHours !== undefined)
      data.outletHours =
        (dto.outletHours as Prisma.InputJsonValue) ?? Prisma.JsonNull;
    if (dto.prepTimeMinutes !== undefined)
      data.prepTimeMinutes = dto.prepTimeMinutes;
    if (dto.deliveryFee !== undefined) data.deliveryFee = dto.deliveryFee;
    if (dto.processingFee !== undefined) data.processingFee = dto.processingFee;
    if (dto.taxRatePercent !== undefined)
      data.taxRatePercent = dto.taxRatePercent;
    if (dto.deliveryRadiusNote !== undefined)
      data.deliveryRadiusNote = trimOrNull(dto.deliveryRadiusNote);

    const existing = await this.prisma.systemSettings.findFirst({
      orderBy: { id: 'asc' },
    });
    const id =
      existing?.id ??
      (
        await this.prisma.systemSettings.create({
          data: { maxOrdersPerDay: 15, orderingEnabled: true },
        })
      ).id;
    return this.prisma.systemSettings.update({ where: { id }, data });
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
