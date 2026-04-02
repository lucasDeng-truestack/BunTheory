import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { OrderBatchStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';

@Injectable()
export class BatchesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.orderBatch.findMany({
      orderBy: { opensAt: 'desc' },
      include: { _count: { select: { orders: true } } },
    });
  }

  findOne(id: string) {
    return this.prisma.orderBatch.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } },
    });
  }

  /** Published batch accepting orders at `now` (half-open [opens, closes)). */
  async findActiveAt(now: Date = new Date()) {
    return this.prisma.orderBatch.findFirst({
      where: {
        status: OrderBatchStatus.PUBLISHED,
        opensAt: { lte: now },
        closesAt: { gt: now },
      },
      orderBy: { opensAt: 'asc' },
    });
  }

  async getBatchItemCount(batchId: string) {
    const agg = await this.prisma.orderItem.aggregate({
      _sum: { quantity: true },
      where: { order: { batchId } },
    });
    return agg._sum.quantity ?? 0;
  }

  private assertWindow(opensAt: Date, closesAt: Date) {
    if (!(opensAt instanceof Date) || !(closesAt instanceof Date)) {
      throw new BadRequestException('Invalid dates');
    }
    if (opensAt >= closesAt) {
      throw new BadRequestException('Closing time must be after opening time.');
    }
  }

  private intervalsOverlap(
    a: { opensAt: Date; closesAt: Date },
    b: { opensAt: Date; closesAt: Date },
  ): boolean {
    return a.opensAt < b.closesAt && b.opensAt < a.closesAt;
  }

  private async assertNoOverlapWithPublished(
    opensAt: Date,
    closesAt: Date,
    excludeId?: string,
  ) {
    const published = await this.prisma.orderBatch.findMany({
      where: {
        status: OrderBatchStatus.PUBLISHED,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    for (const b of published) {
      if (
        this.intervalsOverlap(
          { opensAt, closesAt },
          { opensAt: b.opensAt, closesAt: b.closesAt },
        )
      ) {
        throw new BadRequestException(
          `This time window overlaps another published session (${b.label ?? b.id}).`,
        );
      }
    }
  }

  async create(dto: CreateBatchDto) {
    const opensAt = new Date(dto.opensAt);
    const closesAt = new Date(dto.closesAt);
    const fulfillmentDate = new Date(dto.fulfillmentDate);
    this.assertWindow(opensAt, closesAt);

    return this.prisma.orderBatch.create({
      data: {
        label: dto.label?.trim() || null,
        fulfillmentDate,
        opensAt,
        closesAt,
        maxItems: dto.maxItems,
        status: OrderBatchStatus.DRAFT,
      },
    });
  }

  async update(id: string, dto: UpdateBatchDto) {
    const existing = await this.prisma.orderBatch.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Batch not found');
    }

    const opensAt = dto.opensAt ? new Date(dto.opensAt) : existing.opensAt;
    const closesAt = dto.closesAt ? new Date(dto.closesAt) : existing.closesAt;
    const fulfillmentDate = dto.fulfillmentDate
      ? new Date(dto.fulfillmentDate)
      : existing.fulfillmentDate;

    this.assertWindow(opensAt, closesAt);

    if (existing.status === OrderBatchStatus.PUBLISHED) {
      await this.assertNoOverlapWithPublished(opensAt, closesAt, id);
    }

    return this.prisma.orderBatch.update({
      where: { id },
      data: {
        ...(dto.label !== undefined && {
          label: dto.label?.trim() || null,
        }),
        fulfillmentDate,
        opensAt,
        closesAt,
        ...(dto.maxItems != null && { maxItems: dto.maxItems }),
      },
    });
  }

  async publish(id: string) {
    const batch = await this.prisma.orderBatch.findUnique({ where: { id } });
    if (!batch) {
      throw new NotFoundException('Batch not found');
    }
    if (batch.status !== OrderBatchStatus.DRAFT) {
      throw new BadRequestException('Only draft sessions can be published.');
    }

    await this.assertNoOverlapWithPublished(
      batch.opensAt,
      batch.closesAt,
      id,
    );

    return this.prisma.orderBatch.update({
      where: { id },
      data: {
        status: OrderBatchStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });
  }

  async close(id: string) {
    const batch = await this.prisma.orderBatch.findUnique({ where: { id } });
    if (!batch) {
      throw new NotFoundException('Batch not found');
    }
    if (batch.status !== OrderBatchStatus.PUBLISHED) {
      throw new BadRequestException('Only an open session can be closed.');
    }
    return this.prisma.orderBatch.update({
      where: { id },
      data: { status: OrderBatchStatus.CLOSED },
    });
  }

  /** CLOSED → PUBLISHED. Same overlap rules as publish; optional past-window warning via caller. */
  async reopen(id: string) {
    const batch = await this.prisma.orderBatch.findUnique({ where: { id } });
    if (!batch) {
      throw new NotFoundException('Batch not found');
    }
    if (batch.status !== OrderBatchStatus.CLOSED) {
      throw new BadRequestException('Only a closed batch can be reopened.');
    }

    const now = new Date();
    if (batch.closesAt <= now) {
      throw new BadRequestException(
        'This batch’s time window has already ended. Edit opens/closes times before reopening.',
      );
    }

    await this.assertNoOverlapWithPublished(
      batch.opensAt,
      batch.closesAt,
      id,
    );

    return this.prisma.orderBatch.update({
      where: { id },
      data: {
        status: OrderBatchStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });
  }

  async remove(id: string) {
    const batch = await this.prisma.orderBatch.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } },
    });
    if (!batch) {
      throw new NotFoundException('Batch not found');
    }
    if (batch.status !== OrderBatchStatus.DRAFT) {
      throw new BadRequestException('Only draft sessions can be deleted.');
    }
    if (batch._count.orders > 0) {
      throw new BadRequestException('Cannot delete a session with orders.');
    }
    await this.prisma.orderBatch.delete({ where: { id } });
  }
}
