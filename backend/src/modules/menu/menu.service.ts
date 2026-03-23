import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { Prisma } from '@prisma/client';
import { BatchesService } from '../batches/batches.service';

@Injectable()
export class MenuService {
  constructor(
    private prisma: PrismaService,
    private batchesService: BatchesService,
  ) {}

  /** Admin: full draft menu (mutable). */
  async findAllDraft(availableOnly = false) {
    const where: Prisma.MenuWhereInput = {};
    if (availableOnly) {
      where.available = true;
    }
    return this.prisma.menu.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Storefront: published snapshot for the batch that is open and accepting or showing capacity.
   */
  async findPublishedForStorefront(availableOnly = false) {
    const ctx = await this.batchesService.getStorefrontContext();
    if (ctx.reason !== 'OK' && ctx.reason !== 'SOLD_OUT') {
      return [];
    }
    if (!ctx.batchId) {
      return [];
    }
    const batch = await this.prisma.orderBatch.findUnique({
      where: { id: ctx.batchId },
      include: {
        menuSnapshot: { include: { items: true } },
      },
    });
    if (!batch?.menuSnapshot) {
      return [];
    }
    const snap = batch.menuSnapshot;
    let items = snap.items;
    if (availableOnly) {
      items = items.filter((i) => i.available);
    }
    return items.map((i) => ({
      id: i.id,
      slug: i.slug,
      name: i.name,
      description: i.description,
      price: i.price,
      image: i.image,
      available: i.available,
      createdAt: snap.createdAt,
    }));
  }

  async findOne(id: string) {
    return this.prisma.menu.findUniqueOrThrow({
      where: { id },
    });
  }

  private toSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }

  async create(dto: CreateMenuDto) {
    const slug = dto.slug ?? this.toSlug(dto.name);
    return this.prisma.menu.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        price: new Prisma.Decimal(dto.price),
        image: dto.image,
        available: dto.available ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateMenuDto) {
    const data: Prisma.MenuUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.price !== undefined) data.price = new Prisma.Decimal(dto.price);
    if (dto.image !== undefined) data.image = dto.image;
    if (dto.available !== undefined) data.available = dto.available;

    return this.prisma.menu.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.menu.delete({
      where: { id },
    });
  }
}
