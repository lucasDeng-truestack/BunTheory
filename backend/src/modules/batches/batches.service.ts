import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderBatchStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type StorefrontReason =
  | 'OK'
  | 'NO_BATCH'
  | 'NOT_PUBLISHED'
  | 'BEFORE_OPEN'
  | 'AFTER_CLOSE'
  | 'CLOSED'
  | 'SOLD_OUT';

export interface StorefrontBatchContext {
  batchId: string | null;
  label: string | null;
  fulfillmentDate: string | null;
  opensAt: string | null;
  closesAt: string | null;
  publishedAt: string | null;
  canOrder: boolean;
  reason: StorefrontReason;
  current: number;
  max: number;
}

@Injectable()
export class BatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async getBatchItemCount(batchId: string): Promise<number> {
    const result = await this.prisma.orderItem.aggregate({
      _sum: { quantity: true },
      where: { order: { batchId } },
    });
    return result._sum.quantity ?? 0;
  }

  /**
   * Public storefront: capacity + window state for the batch customers can order into.
   * Respects global `orderingEnabled` in SystemSettings (emergency kill switch).
   */
  async getStorefrontContext(now = new Date()): Promise<StorefrontBatchContext> {
    const ctx = await this.computeStorefrontContext(now);
    const settings = await this.prisma.systemSettings.findFirst();
    if (settings && !settings.orderingEnabled) {
      return { ...ctx, canOrder: false };
    }
    return ctx;
  }

  private async computeStorefrontContext(
    now = new Date(),
  ): Promise<StorefrontBatchContext> {
    const published = await this.prisma.orderBatch.findMany({
      where: {
        status: OrderBatchStatus.PUBLISHED,
        publishedAt: { not: null },
        menuSnapshot: { isNot: null },
      },
      orderBy: { opensAt: 'asc' },
      include: { menuSnapshot: true },
    });

    if (published.length === 0) {
      return this.emptyContext('NO_BATCH');
    }

    const batch = published.find((b) => {
      if (b.status === OrderBatchStatus.CLOSED) return false;
      return b.opensAt <= now && b.closesAt >= now;
    });

    if (!batch) {
      const upcoming = published
        .filter((b) => b.status !== OrderBatchStatus.CLOSED && b.opensAt > now)
        .sort((a, b) => a.opensAt.getTime() - b.opensAt.getTime())[0];
      if (upcoming) {
        return {
          batchId: upcoming.id,
          label: upcoming.label,
          fulfillmentDate: upcoming.fulfillmentDate.toISOString().slice(0, 10),
          opensAt: upcoming.opensAt.toISOString(),
          closesAt: upcoming.closesAt.toISOString(),
          publishedAt: upcoming.publishedAt!.toISOString(),
          canOrder: false,
          reason: 'BEFORE_OPEN',
          current: await this.getBatchItemCount(upcoming.id),
          max: upcoming.maxItems,
        };
      }
      const last = published
        .filter((b) => b.status !== OrderBatchStatus.CLOSED)
        .sort((a, b) => b.closesAt.getTime() - a.closesAt.getTime())[0];
      if (last) {
        return {
          batchId: last.id,
          label: last.label,
          fulfillmentDate: last.fulfillmentDate.toISOString().slice(0, 10),
          opensAt: last.opensAt.toISOString(),
          closesAt: last.closesAt.toISOString(),
          publishedAt: last.publishedAt!.toISOString(),
          canOrder: false,
          reason: 'AFTER_CLOSE',
          current: await this.getBatchItemCount(last.id),
          max: last.maxItems,
        };
      }
      return this.emptyContext('NO_BATCH');
    }

    const current = await this.getBatchItemCount(batch.id);
    if (current >= batch.maxItems) {
      return {
        batchId: batch.id,
        label: batch.label,
        fulfillmentDate: batch.fulfillmentDate.toISOString().slice(0, 10),
        opensAt: batch.opensAt.toISOString(),
        closesAt: batch.closesAt.toISOString(),
        publishedAt: batch.publishedAt!.toISOString(),
        canOrder: false,
        reason: 'SOLD_OUT',
        current,
        max: batch.maxItems,
      };
    }

    return {
      batchId: batch.id,
      label: batch.label,
      fulfillmentDate: batch.fulfillmentDate.toISOString().slice(0, 10),
      opensAt: batch.opensAt.toISOString(),
      closesAt: batch.closesAt.toISOString(),
      publishedAt: batch.publishedAt!.toISOString(),
      canOrder: true,
      reason: 'OK',
      current,
      max: batch.maxItems,
    };
  }

  private emptyContext(reason: StorefrontReason): StorefrontBatchContext {
    return {
      batchId: null,
      label: null,
      fulfillmentDate: null,
      opensAt: null,
      closesAt: null,
      publishedAt: null,
      canOrder: false,
      reason,
      current: 0,
      max: 0,
    };
  }

  /**
   * Batch that accepts new orders right now (published, in window, under capacity).
   */
  async resolveBatchForNewOrder(now = new Date()) {
    const ctx = await this.getStorefrontContext(now);
    if (!ctx.batchId || !ctx.canOrder || ctx.reason !== 'OK') {
      return null;
    }
    const batch = await this.prisma.orderBatch.findUniqueOrThrow({
      where: { id: ctx.batchId },
      include: {
        menuSnapshot: { include: { items: true } },
      },
    });
    if (!batch.menuSnapshot) return null;
    return { batch, snapshot: batch.menuSnapshot, current: ctx.current };
  }

  async listAll() {
    return this.prisma.orderBatch.findMany({
      orderBy: { fulfillmentDate: 'desc' },
      include: {
        menuSnapshot: { select: { id: true, createdAt: true } },
        _count: { select: { orders: true } },
      },
    });
  }

  async findOne(id: string) {
    const b = await this.prisma.orderBatch.findUnique({
      where: { id },
      include: {
        menuSnapshot: { include: { items: true } },
        _count: { select: { orders: true } },
      },
    });
    if (!b) throw new NotFoundException('Batch not found');
    return b;
  }

  async create(dto: {
    label?: string;
    fulfillmentDate: string;
    opensAt: string;
    closesAt: string;
    maxItems: number;
  }) {
    const fulfillmentDate = new Date(dto.fulfillmentDate);
    const opensAt = new Date(dto.opensAt);
    const closesAt = new Date(dto.closesAt);
    if (closesAt <= opensAt) {
      throw new BadRequestException('closesAt must be after opensAt');
    }
    return this.prisma.orderBatch.create({
      data: {
        label: dto.label,
        fulfillmentDate,
        opensAt,
        closesAt,
        maxItems: dto.maxItems,
        status: OrderBatchStatus.DRAFT,
      },
    });
  }

  async update(
    id: string,
    dto: {
      label?: string;
      fulfillmentDate?: Date;
      opensAt?: Date;
      closesAt?: Date;
      maxItems?: number;
    },
  ) {
    const existing = await this.prisma.orderBatch.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Batch not found');
    if (existing.status !== OrderBatchStatus.DRAFT) {
      throw new BadRequestException('Only draft batches can be edited');
    }
    const opensAt = dto.opensAt ?? existing.opensAt;
    const closesAt = dto.closesAt ?? existing.closesAt;
    if (closesAt <= opensAt) {
      throw new BadRequestException('closesAt must be after opensAt');
    }
    return this.prisma.orderBatch.update({
      where: { id },
      data: {
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.fulfillmentDate !== undefined && {
          fulfillmentDate: dto.fulfillmentDate,
        }),
        ...(dto.opensAt !== undefined && { opensAt: dto.opensAt }),
        ...(dto.closesAt !== undefined && { closesAt: dto.closesAt }),
        ...(dto.maxItems !== undefined && { maxItems: dto.maxItems }),
      },
    });
  }

  async publish(batchId: string) {
    const batch = await this.prisma.orderBatch.findUnique({
      where: { id: batchId },
      include: { menuSnapshot: true },
    });
    if (!batch) throw new NotFoundException('Batch not found');
    if (batch.status !== OrderBatchStatus.DRAFT) {
      throw new BadRequestException('Only draft batches can be published');
    }
    if (batch.menuSnapshot) {
      throw new BadRequestException('Batch already has a published menu');
    }

    const menus = await this.prisma.menu.findMany({ orderBy: { createdAt: 'desc' } });
    if (menus.length === 0) {
      throw new BadRequestException('Draft menu is empty; add items before publishing');
    }

    return this.prisma.$transaction(async (tx) => {
      const snapshot = await tx.menuSnapshot.create({
        data: {
          batchId,
          items: {
            create: menus.map((m) => ({
              sourceMenuId: m.id,
              slug: m.slug,
              name: m.name,
              description: m.description,
              price: m.price,
              image: m.image,
              available: m.available,
            })),
          },
        },
        include: { items: true },
      });
      const updated = await tx.orderBatch.update({
        where: { id: batchId },
        data: {
          status: OrderBatchStatus.PUBLISHED,
          publishedAt: new Date(),
        },
      });
      return { batch: updated, snapshot };
    });
  }

  async closeBatch(batchId: string) {
    const batch = await this.prisma.orderBatch.findUnique({ where: { id: batchId } });
    if (!batch) throw new NotFoundException('Batch not found');
    if (batch.status === OrderBatchStatus.CLOSED) {
      return batch;
    }
    return this.prisma.orderBatch.update({
      where: { id: batchId },
      data: { status: OrderBatchStatus.CLOSED },
    });
  }
}
