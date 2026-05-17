import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePosCategoryDto } from './dto/create-pos-category.dto';
import { CreatePosMenuItemDto } from './dto/create-pos-menu-item.dto';
import { UpdatePosMenuItemDto } from './dto/update-pos-menu-item.dto';
import { CreatePosSectionHeaderDto } from './dto/create-pos-section-header.dto';
import { UpdatePosSectionHeaderDto } from './dto/update-pos-section-header.dto';

const menuItemRelations = {
  category: true,
  sectionHeader: true,
} satisfies Prisma.PosMenuItemInclude;

function normHeader(id?: string | null): string | null {
  if (id === undefined || id === null) return null;
  const t = id.trim();
  return t.length ? t : null;
}

@Injectable()
export class PosMenuService {
  constructor(private prisma: PrismaService) {}

  async findAllCategories() {
    return this.prisma.posCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async createCategory(dto: CreatePosCategoryDto) {
    return this.prisma.posCategory.create({
      data: {
        name: dto.name,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async deleteCategory(id: string) {
    await this.prisma.posCategory.findUniqueOrThrow({ where: { id } });
    return this.prisma.posCategory.delete({ where: { id } });
  }

  async findSectionHeadersByCategory(categoryId: string) {
    await this.prisma.posCategory.findUniqueOrThrow({ where: { id: categoryId } });
    return this.prisma.posMenuSectionHeader.findMany({
      where: { categoryId },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    });
  }

  async createSectionHeader(dto: CreatePosSectionHeaderDto) {
    await this.prisma.posCategory.findUniqueOrThrow({
      where: { id: dto.categoryId },
    });
    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined || sortOrder === null) {
      const tail = await this.prisma.posMenuSectionHeader.findFirst({
        where: { categoryId: dto.categoryId },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      sortOrder = (tail?.sortOrder ?? -1) + 1;
    }
    return this.prisma.posMenuSectionHeader.create({
      data: {
        categoryId: dto.categoryId,
        title: dto.title.trim(),
        subtitle: dto.subtitle?.trim() ? dto.subtitle.trim() : null,
        sortOrder,
      },
    });
  }

  async updateSectionHeader(id: string, dto: UpdatePosSectionHeaderDto) {
    await this.prisma.posMenuSectionHeader.findUniqueOrThrow({ where: { id } });
    const data: Prisma.PosMenuSectionHeaderUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.subtitle !== undefined) {
      data.subtitle = dto.subtitle?.trim() ? dto.subtitle.trim() : null;
    }
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    return this.prisma.posMenuSectionHeader.update({ where: { id }, data });
  }

  async deleteSectionHeader(id: string) {
    await this.prisma.posMenuSectionHeader.findUniqueOrThrow({ where: { id } });
    return this.prisma.posMenuSectionHeader.delete({ where: { id } });
  }

  async findAllItems(availableOnly = false) {
    const where: Prisma.PosMenuItemWhereInput = {};
    if (availableOnly) where.available = true;

    const items = await this.prisma.posMenuItem.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: menuItemRelations,
    });

    return items.map((i) => this.mapItem(i));
  }

  async findOneItem(id: string) {
    const item = await this.prisma.posMenuItem.findUnique({
      where: { id },
      include: menuItemRelations,
    });
    if (!item) throw new NotFoundException('POS menu item not found');
    return this.mapItem(item);
  }

  async createItem(dto: CreatePosMenuItemDto) {
    await this.validateHeaderForCategoryPair(
      dto.categoryId ?? null,
      normHeader(dto.sectionHeaderId),
    );

    const item = await this.prisma.posMenuItem.create({
      data: {
        name: dto.name,
        description: dto.description,
        price: new Prisma.Decimal(dto.price),
        image: dto.image,
        available: dto.available ?? true,
        sortOrder: dto.sortOrder ?? 0,
        kind: dto.kind ?? 'MAIN_MEAL',
        categoryId: dto.categoryId ?? null,
        sectionHeaderId: normHeader(dto.sectionHeaderId),
      },
      include: menuItemRelations,
    });
    return this.mapItem(item);
  }

  async updateItem(id: string, dto: UpdatePosMenuItemDto) {
    const current = await this.prisma.posMenuItem.findUniqueOrThrow({
      where: { id },
      select: { categoryId: true, sectionHeaderId: true },
    });

    const nextCat =
      dto.categoryId !== undefined ? dto.categoryId : current.categoryId;
    const nextHeader =
      dto.sectionHeaderId !== undefined
        ? normHeader(dto.sectionHeaderId)
        : normHeader(current.sectionHeaderId);

    await this.validateHeaderForCategoryPair(nextCat ?? null, nextHeader);

    const data: Prisma.PosMenuItemUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.price !== undefined) data.price = new Prisma.Decimal(dto.price);
    if (dto.image !== undefined) data.image = dto.image;
    if (dto.available !== undefined) data.available = dto.available;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.kind !== undefined) data.kind = dto.kind;
    if (dto.categoryId !== undefined) {
      data.category = dto.categoryId
        ? { connect: { id: dto.categoryId } }
        : { disconnect: true };
    }
    if (dto.sectionHeaderId !== undefined) {
      data.sectionHeader = nextHeader
        ? { connect: { id: nextHeader } }
        : { disconnect: true };
    }

    await this.prisma.posMenuItem.update({ where: { id }, data });
    return this.findOneItem(id);
  }

  async deleteItem(id: string) {
    await this.prisma.posMenuItem.findUniqueOrThrow({ where: { id } });
    return this.prisma.posMenuItem.delete({ where: { id } });
  }

  private async validateHeaderForCategoryPair(
    categoryId: string | null,
    headerId: string | null,
  ) {
    if (!headerId) return;
    const h = await this.prisma.posMenuSectionHeader.findUnique({
      where: { id: headerId },
    });
    if (!h) throw new BadRequestException('Section header not found');
    if (!categoryId) {
      throw new BadRequestException(
        'Pick a pillar category (Mains / Sides / Drinks) before assigning a subsection header',
      );
    }
    if (h.categoryId !== categoryId) {
      throw new BadRequestException(
        'Subsection header must belong to the same pillar category as the menu item',
      );
    }
  }

  private mapItem(
    item: Prisma.PosMenuItemGetPayload<{ include: typeof menuItemRelations }>,
  ) {
    return {
      id: item.id,
      categoryId: item.categoryId,
      category: item.category
        ? { id: item.category.id, name: item.category.name }
        : null,
      kind: item.kind,
      sectionHeaderId: item.sectionHeaderId,
      sectionHeader: item.sectionHeader
        ? {
            id: item.sectionHeader.id,
            title: item.sectionHeader.title,
            subtitle: item.sectionHeader.subtitle,
            categoryId: item.sectionHeader.categoryId,
            sortOrder: item.sectionHeader.sortOrder,
          }
        : null,
      name: item.name,
      description: item.description,
      price: Number(item.price),
      image: item.image,
      available: item.available,
      sortOrder: item.sortOrder,
      createdAt: item.createdAt.toISOString(),
    };
  }
}
