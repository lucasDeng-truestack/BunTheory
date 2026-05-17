import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { CreateInventoryPurchaseDto } from './dto/create-inventory-purchase.dto';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { SetRecipeIngredientDto } from './dto/set-recipe-ingredient.dto';

@Injectable()
export class PosInventoryService {
  constructor(private prisma: PrismaService) {}

  // ─── Inventory Items ─────────────────────────────────────────────────────

  async findAllItems() {
    const items = await this.prisma.inventoryItem.findMany({
      orderBy: { name: 'asc' },
    });

    const stockSummaries = await Promise.all(
      items.map((item) => this.computeStock(item.id)),
    );

    return items.map((item, i) => ({
      id: item.id,
      name: item.name,
      unit: item.unit,
      lowStockThreshold: item.lowStockThreshold
        ? Number(item.lowStockThreshold)
        : null,
      createdAt: item.createdAt.toISOString(),
      ...stockSummaries[i],
    }));
  }

  async findOneItem(id: string) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Inventory item not found');
    const stock = await this.computeStock(id);
    return {
      id: item.id,
      name: item.name,
      unit: item.unit,
      lowStockThreshold: item.lowStockThreshold
        ? Number(item.lowStockThreshold)
        : null,
      createdAt: item.createdAt.toISOString(),
      ...stock,
    };
  }

  async createItem(dto: CreateInventoryItemDto) {
    const item = await this.prisma.inventoryItem.create({
      data: {
        name: dto.name.trim(),
        unit: dto.unit,
        lowStockThreshold: dto.lowStockThreshold != null
          ? new Prisma.Decimal(dto.lowStockThreshold)
          : null,
      },
    });
    return this.findOneItem(item.id);
  }

  async updateItem(id: string, dto: Partial<CreateInventoryItemDto>) {
    await this.prisma.inventoryItem.findUniqueOrThrow({ where: { id } });
    const data: Prisma.InventoryItemUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.unit !== undefined) data.unit = dto.unit;
    if (dto.lowStockThreshold !== undefined) {
      data.lowStockThreshold = dto.lowStockThreshold != null
        ? new Prisma.Decimal(dto.lowStockThreshold)
        : null;
    }
    await this.prisma.inventoryItem.update({ where: { id }, data });
    return this.findOneItem(id);
  }

  async deleteItem(id: string) {
    await this.prisma.inventoryItem.findUniqueOrThrow({ where: { id } });
    return this.prisma.inventoryItem.delete({ where: { id } });
  }

  // ─── Purchases ───────────────────────────────────────────────────────────

  async findPurchases(itemId?: string) {
    const where: Prisma.InventoryPurchaseWhereInput = {};
    if (itemId) where.itemId = itemId;
    const purchases = await this.prisma.inventoryPurchase.findMany({
      where,
      orderBy: { purchasedAt: 'desc' },
      include: { item: true },
    });
    return purchases.map((p) => ({
      id: p.id,
      itemId: p.itemId,
      itemName: p.item.name,
      unit: p.item.unit,
      quantity: Number(p.quantity),
      totalCost: Number(p.totalCost),
      unitCostAvg: Number(p.quantity) > 0
        ? Number(p.totalCost) / Number(p.quantity)
        : 0,
      supplierName: p.supplierName,
      notes: p.notes,
      purchasedAt: p.purchasedAt.toISOString(),
    }));
  }

  async createPurchase(dto: CreateInventoryPurchaseDto) {
    await this.prisma.inventoryItem.findUniqueOrThrow({
      where: { id: dto.itemId },
    });

    const quantity = new Prisma.Decimal(dto.quantity);
    const totalCost = new Prisma.Decimal(dto.totalCost);
    const unitCost = Number(quantity) > 0
      ? totalCost.div(quantity)
      : new Prisma.Decimal(0);

    await this.prisma.$transaction([
      this.prisma.inventoryPurchase.create({
        data: {
          itemId: dto.itemId,
          quantity,
          totalCost,
          supplierName: dto.supplierName?.trim() || null,
          notes: dto.notes?.trim() || null,
          purchasedAt: dto.purchasedAt ? new Date(dto.purchasedAt) : new Date(),
        },
      }),
      this.prisma.inventoryStockMovement.create({
        data: {
          itemId: dto.itemId,
          type: 'PURCHASE',
          quantityChange: quantity,
          unitCost,
          notes: dto.supplierName ? `Purchase from ${dto.supplierName}` : 'Purchase',
        },
      }),
    ]);

    return this.findOneItem(dto.itemId);
  }

  // ─── Stock Movements ─────────────────────────────────────────────────────

  async findMovements(itemId?: string) {
    const where: Prisma.InventoryStockMovementWhereInput = {};
    if (itemId) where.itemId = itemId;
    const movements = await this.prisma.inventoryStockMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { item: true },
    });
    return movements.map((m) => ({
      id: m.id,
      itemId: m.itemId,
      itemName: m.item.name,
      unit: m.item.unit,
      type: m.type,
      quantityChange: Number(m.quantityChange),
      unitCost: m.unitCost ? Number(m.unitCost) : null,
      referenceOrderId: m.referenceOrderId,
      notes: m.notes,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  async createMovement(dto: CreateStockMovementDto) {
    await this.prisma.inventoryItem.findUniqueOrThrow({
      where: { id: dto.itemId },
    });
    const movement = await this.prisma.inventoryStockMovement.create({
      data: {
        itemId: dto.itemId,
        type: dto.type,
        quantityChange: new Prisma.Decimal(dto.quantityChange),
        unitCost: dto.unitCost != null
          ? new Prisma.Decimal(dto.unitCost)
          : null,
        notes: dto.notes?.trim() || null,
      },
    });
    return movement;
  }

  // ─── Recipe Ingredients ──────────────────────────────────────────────────

  async getRecipe(menuItemId: string) {
    const ingredients = await this.prisma.posRecipeIngredient.findMany({
      where: { menuItemId },
      include: { inventoryItem: true },
    });
    return ingredients.map((r) => ({
      id: r.id,
      menuItemId: r.menuItemId,
      inventoryItemId: r.inventoryItemId,
      inventoryItemName: r.inventoryItem.name,
      quantityUsed: Number(r.quantityUsed),
      unit: r.unit,
      estimatedCost: this.estimateCost(r.inventoryItemId),
    }));
  }

  async setRecipeIngredient(
    menuItemId: string,
    dto: SetRecipeIngredientDto,
  ) {
    await this.prisma.posMenuItem.findUniqueOrThrow({ where: { id: menuItemId } });
    await this.prisma.inventoryItem.findUniqueOrThrow({
      where: { id: dto.inventoryItemId },
    });

    return this.prisma.posRecipeIngredient.upsert({
      where: {
        menuItemId_inventoryItemId: {
          menuItemId,
          inventoryItemId: dto.inventoryItemId,
        },
      },
      create: {
        menuItemId,
        inventoryItemId: dto.inventoryItemId,
        quantityUsed: new Prisma.Decimal(dto.quantityUsed),
        unit: dto.unit,
      },
      update: {
        quantityUsed: new Prisma.Decimal(dto.quantityUsed),
        unit: dto.unit,
      },
    });
  }

  async deleteRecipeIngredient(menuItemId: string, inventoryItemId: string) {
    return this.prisma.posRecipeIngredient.delete({
      where: {
        menuItemId_inventoryItemId: { menuItemId, inventoryItemId },
      },
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async computeStock(itemId: string) {
    const agg = await this.prisma.inventoryStockMovement.aggregate({
      where: { itemId },
      _sum: { quantityChange: true },
    });
    const currentStock = Number(agg._sum.quantityChange ?? 0);

    const item = await this.prisma.inventoryItem.findUnique({ where: { id: itemId } });
    const threshold = item?.lowStockThreshold ? Number(item.lowStockThreshold) : null;

    const totalPurchasedAgg = await this.prisma.inventoryPurchase.aggregate({
      where: { itemId },
      _sum: { quantity: true, totalCost: true },
    });
    const totalQuantity = Number(totalPurchasedAgg._sum.quantity ?? 0);
    const totalCost = Number(totalPurchasedAgg._sum.totalCost ?? 0);
    const avgUnitCost = totalQuantity > 0 ? totalCost / totalQuantity : 0;

    return {
      currentStock,
      totalPurchased: totalQuantity,
      totalCostPaid: totalCost,
      avgUnitCost,
      isLowStock: threshold != null && currentStock <= threshold,
    };
  }

  /** Returns a placeholder — actual cost calculation happens when recipe is fetched. */
  private estimateCost(_inventoryItemId: string): number {
    return 0;
  }
}
