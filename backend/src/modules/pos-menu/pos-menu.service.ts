import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PosInventoryService,
  PosProductAvailability,
} from '../pos-inventory/pos-inventory.service';
import { CreatePosSectionDto } from './dto/create-pos-section.dto';
import { UpdatePosSectionDto } from './dto/update-pos-section.dto';
import { CreatePosProductDto } from './dto/create-pos-product.dto';
import { UpdatePosProductDto } from './dto/update-pos-product.dto';
import { ReorderProductsDto } from './dto/reorder-products.dto';

const productInclude = {
  combo: {
    include: {
      slots: {
        orderBy: [{ sortOrder: 'asc' as const }, { label: 'asc' as const }],
        include: {
          options: {
            orderBy: [{ sortOrder: 'asc' as const }, { label: 'asc' as const }],
          },
        },
      },
    },
  },
  optionSlots: {
    orderBy: [{ sortOrder: 'asc' as const }, { label: 'asc' as const }],
    include: {
      options: {
        orderBy: [{ sortOrder: 'asc' as const }, { label: 'asc' as const }],
      },
    },
  },
  variants: {
    orderBy: [{ sortOrder: 'asc' as const }, { name: 'asc' as const }],
  },
} satisfies Prisma.PosProductInclude;

@Injectable()
export class PosMenuService {
  constructor(
    private prisma: PrismaService,
    private inventory: PosInventoryService,
  ) {}

  async getFullMenu(availableOnly = false) {
    const sections = await this.prisma.posMenuSection.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        products: {
          where: availableOnly ? { available: true } : undefined,
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: productInclude,
        },
      },
    });

    const productIds = sections.flatMap((s) => s.products.map((p) => p.id));
    const availability =
      await this.inventory.getAvailabilityForProducts(productIds);

    return sections.map((s) => ({
      id: s.id,
      name: s.name,
      sortOrder: s.sortOrder,
      products: s.products.map((p) =>
        this.mapProduct(p, availability.get(p.id)),
      ),
    }));
  }

  async findAllSections() {
    return this.prisma.posMenuSection.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async createSection(dto: CreatePosSectionDto) {
    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined) {
      const tail = await this.prisma.posMenuSection.findFirst({
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      sortOrder = (tail?.sortOrder ?? -1) + 1;
    }
    return this.prisma.posMenuSection.create({
      data: { name: dto.name.trim(), sortOrder },
    });
  }

  async updateSection(id: string, dto: UpdatePosSectionDto) {
    await this.prisma.posMenuSection.findUniqueOrThrow({ where: { id } });
    const data: Prisma.PosMenuSectionUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    return this.prisma.posMenuSection.update({ where: { id }, data });
  }

  async deleteSection(id: string) {
    await this.prisma.posMenuSection.findUniqueOrThrow({ where: { id } });
    return this.prisma.posMenuSection.delete({ where: { id } });
  }

  async findOneProduct(id: string) {
    const product = await this.prisma.posProduct.findUnique({
      where: { id },
      include: productInclude,
    });
    if (!product) throw new NotFoundException('Product not found');
    const availability = await this.inventory.getProductAvailability(id);
    return this.mapProduct(product, availability);
  }

  async createProduct(dto: CreatePosProductDto) {
    await this.prisma.posMenuSection.findUniqueOrThrow({
      where: { id: dto.sectionId },
    });
    this.validateProductPayload(dto.type, dto);

    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined) {
      const tail = await this.prisma.posProduct.findFirst({
        where: { sectionId: dto.sectionId },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      sortOrder = (tail?.sortOrder ?? -1) + 1;
    }

    const product = await this.prisma.posProduct.create({
      data: {
        sectionId: dto.sectionId,
        type: dto.type,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        image: dto.image || null,
        basePrice: new Prisma.Decimal(dto.basePrice),
        available: dto.available ?? true,
        sortOrder,
        ...(dto.type === 'COMBO' && dto.slots
          ? {
              combo: {
                create: {
                  includesText: dto.includesText?.trim() || null,
                  slots: {
                    create: dto.slots.map((slot, si) => ({
                      label: slot.label.trim(),
                      sortOrder: slot.sortOrder ?? si,
                      required: slot.required ?? true,
                      options: {
                        create: slot.options.map((opt, oi) => ({
                          label: opt.label.trim(),
                          priceDelta: new Prisma.Decimal(opt.priceDelta ?? 0),
                          sortOrder: opt.sortOrder ?? oi,
                        })),
                      },
                    })),
                  },
                },
              },
            }
          : {}),
        ...(dto.type === 'VARIANT' && dto.variants
          ? {
              variants: {
                create: dto.variants.map((v, vi) => ({
                  name: v.name.trim(),
                  price: new Prisma.Decimal(v.price),
                  sortOrder: v.sortOrder ?? vi,
                })),
              },
            }
          : {}),
        ...((dto.type === 'SIMPLE' || dto.type === 'VARIANT') &&
        dto.optionSlots?.length
          ? {
              optionSlots: {
                create: dto.optionSlots.map((slot, si) => ({
                  label: slot.label.trim(),
                  sortOrder: slot.sortOrder ?? si,
                  required: slot.required ?? true,
                  options: {
                    create: slot.options.map((opt, oi) => ({
                      label: opt.label.trim(),
                      priceDelta: new Prisma.Decimal(opt.priceDelta ?? 0),
                      sortOrder: opt.sortOrder ?? oi,
                    })),
                  },
                })),
              },
            }
          : {}),
      },
      include: productInclude,
    });

    return this.findOneProduct(product.id);
  }

  async updateProduct(id: string, dto: UpdatePosProductDto) {
    const current = await this.prisma.posProduct.findUniqueOrThrow({
      where: { id },
      include: productInclude,
    });

    if (dto.sectionId) {
      await this.prisma.posMenuSection.findUniqueOrThrow({
        where: { id: dto.sectionId },
      });
    }

    const data: Prisma.PosProductUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) {
      data.description = dto.description?.trim() || null;
    }
    if (dto.image !== undefined) data.image = dto.image || null;
    if (dto.basePrice !== undefined) {
      data.basePrice = new Prisma.Decimal(dto.basePrice);
    }
    if (dto.available !== undefined) data.available = dto.available;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.sectionId !== undefined) {
      data.section = { connect: { id: dto.sectionId } };
    }

    await this.prisma.posProduct.update({ where: { id }, data });

    if (current.type === 'COMBO' && (dto.slots || dto.includesText !== undefined)) {
      const combo = current.combo;
      if (!combo) throw new BadRequestException('Combo config missing');
      if (dto.includesText !== undefined) {
        await this.prisma.posCombo.update({
          where: { id: combo.id },
          data: { includesText: dto.includesText?.trim() || null },
        });
      }
      if (dto.slots) {
        for (const slot of combo.slots) {
          await this.prisma.posComboSlotOption.deleteMany({
            where: { slotId: slot.id },
          });
        }
        await this.prisma.posComboSlot.deleteMany({ where: { comboId: combo.id } });
        for (const [si, slot] of dto.slots.entries()) {
          await this.prisma.posComboSlot.create({
            data: {
              comboId: combo.id,
              label: slot.label.trim(),
              sortOrder: slot.sortOrder ?? si,
              required: slot.required ?? true,
              options: {
                create: slot.options.map((opt, oi) => ({
                  label: opt.label.trim(),
                  priceDelta: new Prisma.Decimal(opt.priceDelta ?? 0),
                  sortOrder: opt.sortOrder ?? oi,
                })),
              },
            },
          });
        }
      }
    }

    if (current.type === 'VARIANT' && dto.variants) {
      await this.prisma.posProductVariant.deleteMany({ where: { productId: id } });
      for (const [vi, v] of dto.variants.entries()) {
        await this.prisma.posProductVariant.create({
          data: {
            productId: id,
            name: v.name.trim(),
            price: new Prisma.Decimal(v.price),
            sortOrder: v.sortOrder ?? vi,
          },
        });
      }
    }

    if (
      (current.type === 'SIMPLE' || current.type === 'VARIANT') &&
      dto.optionSlots
    ) {
      await this.replaceProductOptionSlots(id, dto.optionSlots);
    }

    return this.findOneProduct(id);
  }

  private async replaceProductOptionSlots(
    productId: string,
    slots: NonNullable<UpdatePosProductDto['optionSlots']>,
  ) {
    const existing = await this.prisma.posProductOptionSlot.findMany({
      where: { productId },
      select: { id: true },
    });
    for (const slot of existing) {
      await this.prisma.posProductOptionSlotOption.deleteMany({
        where: { slotId: slot.id },
      });
    }
    await this.prisma.posProductOptionSlot.deleteMany({ where: { productId } });
    for (const [si, slot] of slots.entries()) {
      await this.prisma.posProductOptionSlot.create({
        data: {
          productId,
          label: slot.label.trim(),
          sortOrder: slot.sortOrder ?? si,
          required: slot.required ?? true,
          options: {
            create: slot.options.map((opt, oi) => ({
              label: opt.label.trim(),
              priceDelta: new Prisma.Decimal(opt.priceDelta ?? 0),
              sortOrder: opt.sortOrder ?? oi,
            })),
          },
        },
      });
    }
  }

  async deleteProduct(id: string) {
    await this.prisma.posProduct.findUniqueOrThrow({ where: { id } });
    return this.prisma.posProduct.delete({ where: { id } });
  }

  async reorderProducts(dto: ReorderProductsDto) {
    await this.prisma.posMenuSection.findUniqueOrThrow({
      where: { id: dto.sectionId },
    });
    await this.prisma.$transaction(
      dto.productIds.map((productId, index) =>
        this.prisma.posProduct.update({
          where: { id: productId },
          data: { sortOrder: index },
        }),
      ),
    );
    return this.getFullMenu(false);
  }

  private validateProductPayload(
    type: string,
    dto: { slots?: unknown[]; variants?: unknown[] },
  ) {
    if (type === 'COMBO' && (!dto.slots || dto.slots.length === 0)) {
      throw new BadRequestException('Combo products require at least one slot');
    }
    if (type === 'VARIANT' && (!dto.variants || dto.variants.length === 0)) {
      throw new BadRequestException('Variant products require at least one variant');
    }
  }

  private mapOptionSlots(
    slots: Prisma.PosProductGetPayload<{
      include: { optionSlots: { include: { options: true } } };
    }>['optionSlots'],
  ) {
    return slots.map((slot) => ({
      id: slot.id,
      label: slot.label,
      sortOrder: slot.sortOrder,
      required: slot.required,
      options: slot.options.map((opt) => ({
        id: opt.id,
        label: opt.label,
        priceDelta: Number(opt.priceDelta),
        sortOrder: opt.sortOrder,
      })),
    }));
  }

  private mapProduct(
    product: Prisma.PosProductGetPayload<{ include: typeof productInclude }>,
    availability?: PosProductAvailability,
  ) {
    return {
      id: product.id,
      sectionId: product.sectionId,
      type: product.type,
      name: product.name,
      description: product.description,
      image: product.image,
      basePrice: Number(product.basePrice),
      available: product.available,
      soldOut: availability?.soldOut ?? false,
      maxServings: availability?.maxServings ?? null,
      limitingIngredient: availability?.limitingIngredient ?? null,
      sortOrder: product.sortOrder,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
      combo: product.combo
        ? {
            id: product.combo.id,
            includesText: product.combo.includesText,
            slots: product.combo.slots.map((slot) => ({
              id: slot.id,
              label: slot.label,
              sortOrder: slot.sortOrder,
              required: slot.required,
              options: slot.options.map((opt) => ({
                id: opt.id,
                label: opt.label,
                priceDelta: Number(opt.priceDelta),
                sortOrder: opt.sortOrder,
              })),
            })),
          }
        : null,
      variants: product.variants.map((v) => ({
        id: v.id,
        name: v.name,
        price: Number(v.price),
        sortOrder: v.sortOrder,
      })),
      optionSlots: this.mapOptionSlots(product.optionSlots),
    };
  }
}
