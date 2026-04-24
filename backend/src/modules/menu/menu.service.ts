import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { Prisma } from '@prisma/client';

const menuRelations = {
  optionGroups: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      options: { orderBy: { sortOrder: 'asc' as const } },
    },
  },
} satisfies Prisma.MenuInclude;

export type MenuWithRelations = Prisma.MenuGetPayload<{
  include: typeof menuRelations;
}>;

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  /** Admin: full live menu with relations. */
  async findAllDraft(availableOnly = false) {
    const where: Prisma.MenuWhereInput = {};
    if (availableOnly) {
      where.available = true;
    }
    const items = await this.prisma.menu.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: menuRelations,
    });
    const soldMap = await this.getSoldQuantitiesMap(items.map((m) => m.id));
    return items.map((m) => this.mapMenuRow(m, soldMap));
  }

  /**
   * Storefront: live menu rows with sold-out derived from order totals vs maxQuantity.
   */
  async findPublishedForStorefront(availableOnly = false) {
    const where: Prisma.MenuWhereInput = {};
    if (availableOnly) {
      where.available = true;
    }
    const items = await this.prisma.menu.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: menuRelations,
    });
    const soldMap = await this.getSoldQuantitiesMap(items.map((m) => m.id));
    return items.map((m) => this.mapMenuRow(m, soldMap));
  }

  async findOne(id: string) {
    const row = await this.prisma.menu.findUniqueOrThrow({
      where: { id },
      include: menuRelations,
    });
    const soldMap = await this.getSoldQuantitiesMap([row.id]);
    return this.mapMenuRow(row, soldMap);
  }

  private async getSoldQuantitiesMap(
    menuIds: string[],
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (menuIds.length === 0) return map;
    const rows = await this.prisma.orderItem.groupBy({
      by: ['menuId'],
      where: { menuId: { in: menuIds } },
      _sum: { quantity: true },
    });
    for (const r of rows) {
      map.set(r.menuId, r._sum.quantity ?? 0);
    }
    return map;
  }

  private mapMenuRow(
    m: MenuWithRelations,
    soldMap: Map<string, number>,
  ) {
    const sold = soldMap.get(m.id) ?? 0;
    const maxQ = m.maxQuantity;
    const soldOut =
      maxQ != null && sold >= maxQ;
    return {
      id: m.id,
      slug: m.slug,
      name: m.name,
      description: m.description,
      price: Number(m.price),
      image: m.image,
      isFavorite: m.isFavorite,
      available: m.available,
      maxQuantity: maxQ,
      sortOrder: m.sortOrder,
      createdAt: m.createdAt.toISOString(),
      soldOut,
      soldQuantity: sold,
      optionGroups: m.optionGroups.map((g) => ({
        id: g.id,
        name: g.name,
        required: g.required,
        multiSelect: g.multiSelect,
        sortOrder: g.sortOrder,
        options: g.options.map((o) => ({
          id: o.id,
          label: o.label,
          priceDelta: Number(o.priceDelta),
          sortOrder: o.sortOrder,
        })),
      })),
    };
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
        isFavorite: dto.isFavorite ?? false,
        available: dto.available ?? true,
        maxQuantity: dto.maxQuantity ?? null,
        sortOrder: dto.sortOrder ?? 0,
        optionGroups:
          dto.optionGroups && dto.optionGroups.length > 0
            ? {
                create: dto.optionGroups.map((g, gi) => ({
                  sortOrder: g.sortOrder ?? gi,
                  name: g.name,
                  required: g.required ?? false,
                  multiSelect: g.multiSelect ?? false,
                  options: {
                    create: g.options.map((o, oi) => ({
                      sortOrder: o.sortOrder ?? oi,
                      label: o.label,
                      priceDelta: new Prisma.Decimal(o.priceDelta),
                    })),
                  },
                })),
              }
            : undefined,
      },
      include: menuRelations,
    });
  }

  async update(id: string, dto: UpdateMenuDto) {
    const data: Prisma.MenuUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.price !== undefined) data.price = new Prisma.Decimal(dto.price);
    if (dto.image !== undefined) data.image = dto.image;
    if (dto.isFavorite !== undefined) data.isFavorite = dto.isFavorite;
    if (dto.available !== undefined) data.available = dto.available;
    if (dto.maxQuantity !== undefined) {
      data.maxQuantity = dto.maxQuantity ?? null;
    }
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    const replaceOptions = dto.optionGroups !== undefined;

    if (replaceOptions) {
      await this.prisma.$transaction(async (tx) => {
        await tx.menuOptionGroup.deleteMany({ where: { menuId: id } });
        const groups = dto.optionGroups ?? [];
        for (let gi = 0; gi < groups.length; gi++) {
          const g = groups[gi];
          await tx.menuOptionGroup.create({
            data: {
              menuId: id,
              sortOrder: g.sortOrder ?? gi,
              name: g.name,
              required: g.required ?? false,
              multiSelect: g.multiSelect ?? false,
              options: {
                create: g.options.map((o, oi) => ({
                  sortOrder: o.sortOrder ?? oi,
                  label: o.label,
                  priceDelta: new Prisma.Decimal(o.priceDelta),
                })),
              },
            },
          });
        }
        if (Object.keys(data).length > 0) {
          await tx.menu.update({
            where: { id },
            data,
          });
        }
      });
    } else if (Object.keys(data).length > 0) {
      await this.prisma.menu.update({
        where: { id },
        data,
      });
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    const orderLineCount = await this.prisma.orderItem.count({
      where: { menuId: id },
    });
    if (orderLineCount > 0) {
      throw new ConflictException(
        'This item appears on existing orders and cannot be removed. Turn off Available in Edit to hide it from the menu.',
      );
    }

    try {
      return await this.prisma.menu.delete({
        where: { id },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2003'
      ) {
        throw new ConflictException(
          'This item is still linked to orders and cannot be removed. Hide it from the menu instead.',
        );
      }
      throw e;
    }
  }
}
