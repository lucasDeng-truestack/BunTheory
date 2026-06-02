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

const MOVEMENT_COOK_START = 'COOK_START';
const MOVEMENT_REVERT_COOK = 'REVERT_COOK';
const MOVEMENT_CANCEL_COOK = 'CANCEL_COOK';

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
