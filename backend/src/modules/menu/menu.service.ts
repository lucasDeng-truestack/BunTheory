import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  async findAll(availableOnly = false) {
    const where: Prisma.MenuWhereInput = {};
    if (availableOnly) {
      where.available = true;
    }
    return this.prisma.menu.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
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
