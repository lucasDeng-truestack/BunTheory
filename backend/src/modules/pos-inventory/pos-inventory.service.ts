import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { SetProductIngredientsDto } from './dto/set-product-ingredients.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';

const MOVEMENT_COOK_START = 'COOK_START';
const MOVEMENT_REVERT_COOK = 'REVERT_COOK';
const MOVEMENT_CANCEL_COOK = 'CANCEL_COOK';
/** Manual changes from the inventory screen. restoreAfterCook reads COOK_START only. */
const MOVEMENT_RESTOCK = 'RESTOCK';
const MOVEMENT_REMOVE = 'MANUAL_REMOVE';
const MOVEMENT_COUNT = 'STOCK_COUNT';

export type PosProductAvailability = {
  soldOut: boolean;
  maxServings: number | null;
  limitingIngredient: string | null;
};

function toNumber(value: Prisma.Decimal | number): number {
  return typeof value === 'number' ? value : value.toNumber();
}

@Injectable()
export class PosInventoryService {
  constructor(private readonly prisma: PrismaService) {}

  private mapItem(item: {
    id: string;
    name: string;
    unit: string | null;
    isCountable: boolean;
    quantityOnHand: Prisma.Decimal;
    lowStockThreshold: Prisma.Decimal | null;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const qty = toNumber(item.quantityOnHand);
    const threshold =
      item.lowStockThreshold != null
        ? toNumber(item.lowStockThreshold)
        : null;
    return {
      id: item.id,
      name: item.name,
      unit: item.unit,
      isCountable: item.isCountable,
      quantityOnHand: qty,
      lowStockThreshold: threshold,
      isLowStock:
        item.isCountable &&
        threshold != null &&
        threshold > 0 &&
        qty <= threshold,
      sortOrder: item.sortOrder,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  async findAllItems() {
    const items = await this.prisma.posInventoryItem.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return items.map((i) => this.mapItem(i));
  }

  async createItem(dto: CreateInventoryItemDto) {
    const item = await this.prisma.posInventoryItem.create({
      data: {
        name: dto.name.trim(),
        unit: dto.unit?.trim() || null,
        isCountable: dto.isCountable ?? true,
        quantityOnHand: dto.quantityOnHand ?? 0,
        lowStockThreshold: dto.lowStockThreshold ?? null,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    return this.mapItem(item);
  }

  async updateItem(id: string, dto: UpdateInventoryItemDto) {
    const existing = await this.prisma.posInventoryItem.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Inventory item not found');

    const item = await this.prisma.posInventoryItem.update({
      where: { id },
      data: {
        ...(dto.name != null ? { name: dto.name.trim() } : {}),
        ...(dto.unit !== undefined ? { unit: dto.unit?.trim() || null } : {}),
        ...(dto.isCountable !== undefined
          ? { isCountable: dto.isCountable }
          : {}),
        ...(dto.quantityOnHand !== undefined
          ? { quantityOnHand: dto.quantityOnHand }
          : {}),
        ...(dto.lowStockThreshold !== undefined
          ? { lowStockThreshold: dto.lowStockThreshold }
          : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
    return this.mapItem(item);
  }

  async deleteItem(id: string) {
    const existing = await this.prisma.posInventoryItem.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Inventory item not found');
    await this.prisma.posInventoryItem.delete({ where: { id } });
    return { ok: true };
  }

  /**
   * Add, remove or set a stock count, as a change on the server plus a movement row.
   * A count that would go below zero is refused with how much is left.
   */
  async adjustStock(id: string, dto: AdjustStockDto) {
    const mode = dto.mode ?? 'add';
    const item = await this.prisma.$transaction(async (tx) => {
      // Lock the row first, so a kitchen deduction cannot land between this read and the
      // update. Without it a "set" count could save a different number than was typed.
      await tx.$queryRaw`SELECT id FROM "PosInventoryItem" WHERE id = ${id} FOR UPDATE`;
      const existing = await tx.posInventoryItem.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Inventory item not found');

      const amount = new Prisma.Decimal(dto.amount);
      const delta =
        mode === 'set' ? amount.sub(existing.quantityOnHand) : amount;
      if (mode === 'set' && amount.isNegative()) {
        throw new BadRequestException('A stock count cannot be below zero.');
      }
      if (delta.isZero()) return existing;

      const updated = await tx.posInventoryItem.update({
        where: { id },
        data: { quantityOnHand: { increment: delta } },
      });
      if (updated.quantityOnHand.isNegative()) {
        // Throwing rolls the increment back.
        throw new BadRequestException(
          `Only ${toNumber(existing.quantityOnHand)} ${existing.unit ?? ''} of ${existing.name} left.`.replace(
            /\s+/g,
            ' ',
          ),
        );
      }
      await tx.posInventoryMovement.create({
        data: {
          inventoryItemId: id,
          delta,
          reason:
            mode === 'set'
              ? MOVEMENT_COUNT
              : delta.isNegative()
                ? MOVEMENT_REMOVE
                : MOVEMENT_RESTOCK,
        },
      });
      return updated;
    });
    return this.mapItem(item);
  }

  /**
   * Everything the stock screen needs in one call: every menu item with its on/off switch,
   * servings left and recipe, and every stock item with the menu items that use it.
   */
  async getOverview() {
    const [sections, items, links] = await Promise.all([
      this.prisma.posMenuSection.findMany({
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          products: {
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            select: { id: true, name: true, available: true, type: true },
          },
        },
      }),
      this.prisma.posInventoryItem.findMany({
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.posProductIngredient.findMany({
        include: { inventoryItem: true },
      }),
    ]);

    const productIds = sections.flatMap((s) => s.products.map((p) => p.id));
    const servings = this.computeServings(productIds, links);
    const productName = new Map(
      sections.flatMap((s) => s.products.map((p) => [p.id, p.name] as const)),
    );

    return {
      sections: sections.map((section) => ({
        id: section.id,
        name: section.name,
        products: section.products.map((p) => {
          const s = servings.get(p.id);
          return {
            id: p.id,
            name: p.name,
            type: p.type,
            available: p.available,
            tracked: s?.tracked ?? false,
            servingsLeft: s?.maxServings ?? null,
            limitedBy: s?.limitedBy ?? null,
            recipe: links
              .filter((l) => l.productId === p.id)
              .map((l) => ({
                inventoryItemId: l.inventoryItemId,
                name: l.inventoryItem.name,
                unit: l.inventoryItem.unit,
                isCountable: l.inventoryItem.isCountable,
                quantityPerUnit: toNumber(l.quantityPerUnit),
              })),
          };
        }),
      })),
      items: items.map((item) => ({
        ...this.mapItem(item),
        usedBy: links
          .filter((l) => l.inventoryItemId === item.id)
          .map((l) => ({
            productId: l.productId,
            name: productName.get(l.productId) ?? '',
            quantityPerUnit: toNumber(l.quantityPerUnit),
          })),
      })),
    };
  }

  /** Servings each product can still make from its counted ingredients, and which one runs out first. */
  private computeServings(
    productIds: string[],
    links: Array<{
      productId: string;
      quantityPerUnit: Prisma.Decimal;
      inventoryItem: {
        name: string;
        isCountable: boolean;
        quantityOnHand: Prisma.Decimal;
      };
    }>,
  ) {
    const result = new Map<
      string,
      { tracked: boolean; maxServings: number | null; limitedBy: string | null }
    >();
    for (const productId of productIds) {
      let maxServings = Number.POSITIVE_INFINITY;
      let limitedBy: string | null = null;
      for (const link of links) {
        if (link.productId !== productId || !link.inventoryItem.isCountable) {
          continue;
        }
        const perUnit = toNumber(link.quantityPerUnit);
        if (perUnit <= 0) continue;
        const n = Math.floor(
          toNumber(link.inventoryItem.quantityOnHand) / perUnit,
        );
        if (n < maxServings) {
          maxServings = n;
          limitedBy = link.inventoryItem.name;
        }
      }
      const tracked = maxServings !== Number.POSITIVE_INFINITY;
      result.set(productId, {
        tracked,
        maxServings: tracked ? Math.max(0, maxServings) : null,
        limitedBy: tracked ? limitedBy : null,
      });
    }
    return result;
  }

  /**
   * Derive menu availability from countable ingredient recipes (BOM).
   * Products without countable links are never sold out from inventory alone.
   */
  async getAvailabilityForProducts(
    productIds: string[],
  ): Promise<Map<string, PosProductAvailability>> {
    const result = new Map<string, PosProductAvailability>();
    if (productIds.length === 0) return result;

    const links = await this.prisma.posProductIngredient.findMany({
      where: { productId: { in: productIds } },
      include: { inventoryItem: true },
    });

    const linksByProduct = new Map<string, typeof links>();
    for (const link of links) {
      const group = linksByProduct.get(link.productId) ?? [];
      group.push(link);
      linksByProduct.set(link.productId, group);
    }

    for (const productId of productIds) {
      const productLinks = linksByProduct.get(productId) ?? [];
      const countable = productLinks.filter(
        (link) => link.inventoryItem.isCountable,
      );

      if (countable.length === 0) {
        result.set(productId, {
          soldOut: false,
          maxServings: null,
          limitingIngredient: null,
        });
        continue;
      }

      let maxServings = Number.POSITIVE_INFINITY;
      let limitingIngredient: string | null = null;

      for (const link of countable) {
        const qty = toNumber(link.inventoryItem.quantityOnHand);
        const perUnit = toNumber(link.quantityPerUnit);
        if (perUnit <= 0) continue;
        const servings = Math.floor(qty / perUnit);
        if (servings < maxServings) {
          maxServings = servings;
          limitingIngredient = link.inventoryItem.name;
        }
      }

      const finalMax =
        maxServings === Number.POSITIVE_INFINITY ? null : maxServings;
      result.set(productId, {
        soldOut: finalMax !== null && finalMax < 1,
        maxServings: finalMax,
        limitingIngredient:
          finalMax !== null && finalMax < 1 ? limitingIngredient : null,
      });
    }

    return result;
  }

  async getProductAvailability(productId: string) {
    const map = await this.getAvailabilityForProducts([productId]);
    return (
      map.get(productId) ?? {
        soldOut: false,
        maxServings: null,
        limitingIngredient: null,
      }
    );
  }

  async getProductIngredients(productId: string) {
    const product = await this.prisma.posProduct.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const links = await this.prisma.posProductIngredient.findMany({
      where: { productId },
      include: { inventoryItem: true },
      orderBy: { inventoryItem: { sortOrder: 'asc' } },
    });

    return links.map((link) => ({
      id: link.id,
      inventoryItemId: link.inventoryItemId,
      quantityPerUnit: toNumber(link.quantityPerUnit),
      inventoryItem: this.mapItem(link.inventoryItem),
    }));
  }

  async setProductIngredients(productId: string, dto: SetProductIngredientsDto) {
    const product = await this.prisma.posProduct.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const ids = dto.ingredients.map((i) => i.inventoryItemId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Duplicate inventory items in recipe');
    }

    if (ids.length > 0) {
      const found = await this.prisma.posInventoryItem.count({
        where: { id: { in: ids } },
      });
      if (found !== ids.length) {
        throw new BadRequestException('One or more inventory items not found');
      }
    }

    await this.prisma.$transaction([
      this.prisma.posProductIngredient.deleteMany({ where: { productId } }),
      ...dto.ingredients.map((ing) =>
        this.prisma.posProductIngredient.create({
          data: {
            productId,
            inventoryItemId: ing.inventoryItemId,
            quantityPerUnit: ing.quantityPerUnit,
          },
        }),
      ),
    ]);

    return this.getProductIngredients(productId);
  }

  /** Per-order countable ingredient demand from line items. */
  private async buildDemandForOrder(orderId: string) {
    const order = await this.prisma.posOrder.findUnique({
      where: { id: orderId },
      include: { orderItems: true },
    });
    if (!order) throw new NotFoundException('POS order not found');

    const demand = new Map<
      string,
      { name: string; amount: Prisma.Decimal }
    >();

    for (const line of order.orderItems) {
      if (!line.productId) continue;

      const links = await this.prisma.posProductIngredient.findMany({
        where: { productId: line.productId },
        include: { inventoryItem: true },
      });

      for (const link of links) {
        if (!link.inventoryItem.isCountable) continue;
        const need = link.quantityPerUnit.mul(line.quantity);
        const prev = demand.get(link.inventoryItemId);
        if (prev) {
          prev.amount = prev.amount.add(need);
        } else {
          demand.set(link.inventoryItemId, {
            name: link.inventoryItem.name,
            amount: need,
          });
        }
      }
    }

    return { order, demand };
  }

  async deductForCookStart(orderId: string) {
    const { order, demand } = await this.buildDemandForOrder(orderId);
    if (order.inventoryDeductedAt) return;

    if (demand.size === 0) {
      await this.prisma.posOrder.update({
        where: { id: orderId },
        data: { inventoryDeductedAt: new Date() },
      });
      return;
    }

    const shortages: string[] = [];
    for (const [itemId, { name, amount }] of demand) {
      const item = await this.prisma.posInventoryItem.findUnique({
        where: { id: itemId },
      });
      if (!item) continue;
      if (item.quantityOnHand.lessThan(amount)) {
        shortages.push(
          `${name}: need ${toNumber(amount)}, have ${toNumber(item.quantityOnHand)}`,
        );
      }
    }

    if (shortages.length > 0) {
      throw new BadRequestException({
        message: 'Not enough inventory to start cooking',
        shortages,
      });
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      for (const [itemId, { amount }] of demand) {
        await tx.posInventoryItem.update({
          where: { id: itemId },
          data: { quantityOnHand: { decrement: amount } },
        });
        await tx.posInventoryMovement.create({
          data: {
            inventoryItemId: itemId,
            orderId,
            delta: amount.neg(),
            reason: MOVEMENT_COOK_START,
          },
        });
      }
      await tx.posOrder.update({
        where: { id: orderId },
        data: { inventoryDeductedAt: now },
      });
    });
  }

  async restoreAfterCook(orderId: string, reason: string) {
    const order = await this.prisma.posOrder.findUnique({
      where: { id: orderId },
    });
    if (!order?.inventoryDeductedAt) return;

    const movements = await this.prisma.posInventoryMovement.findMany({
      where: { orderId, reason: MOVEMENT_COOK_START },
    });

    await this.prisma.$transaction(async (tx) => {
      for (const mov of movements) {
        const restore = mov.delta.neg();
        await tx.posInventoryItem.update({
          where: { id: mov.inventoryItemId },
          data: { quantityOnHand: { increment: restore } },
        });
        await tx.posInventoryMovement.create({
          data: {
            inventoryItemId: mov.inventoryItemId,
            orderId,
            delta: restore,
            reason,
          },
        });
      }
      await tx.posOrder.update({
        where: { id: orderId },
        data: { inventoryDeductedAt: null },
      });
    });
  }
}
