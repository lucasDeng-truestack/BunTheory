import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePosPurchaseDto } from './dto/create-pos-purchase.dto';

@Injectable()
export class PosPurchasesService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: { from?: string; to?: string }) {
    const where: Prisma.PosPurchaseWhereInput = {};

    if (filters?.from || filters?.to) {
      where.purchasedAt = {};
      if (filters.from) {
        const d = new Date(filters.from);
        where.purchasedAt.gte = new Date(
          d.getFullYear(),
          d.getMonth(),
          d.getDate(),
        );
      }
      if (filters.to) {
        const d = new Date(filters.to);
        where.purchasedAt.lt = new Date(
          d.getFullYear(),
          d.getMonth(),
          d.getDate() + 1,
        );
      }
    }

    const rows = await this.prisma.posPurchase.findMany({
      where,
      orderBy: { purchasedAt: 'desc' },
      include: {
        createdBy: { select: { id: true, email: true, displayName: true } },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      remark: r.remark,
      amount: Number(r.amount),
      purchasedAt: r.purchasedAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
      createdBy: r.createdBy,
    }));
  }

  async create(dto: CreatePosPurchaseDto, adminId?: string) {
    const row = await this.prisma.posPurchase.create({
      data: {
        remark: dto.remark.trim(),
        amount: new Prisma.Decimal(dto.amount),
        purchasedAt: dto.purchasedAt ? new Date(dto.purchasedAt) : new Date(),
        createdByAdminId: adminId ?? null,
      },
      include: {
        createdBy: { select: { id: true, email: true, displayName: true } },
      },
    });

    return {
      id: row.id,
      remark: row.remark,
      amount: Number(row.amount),
      purchasedAt: row.purchasedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      createdBy: row.createdBy,
    };
  }

  async delete(id: string) {
    await this.prisma.posPurchase.findUniqueOrThrow({ where: { id } });
    return this.prisma.posPurchase.delete({ where: { id } });
  }
}
