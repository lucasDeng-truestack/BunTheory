import { PrismaClient } from '@prisma/client';

/**
 * Sample countable / non-countable stock and menu recipes for Weekend Grills POS.
 */
export async function seedPosInventory(prisma: PrismaClient) {
  async function upsertItem(spec: {
    name: string;
    unit?: string;
    isCountable: boolean;
    quantityOnHand: number;
    lowStockThreshold?: number;
    sortOrder: number;
  }) {
    return prisma.posInventoryItem.upsert({
      where: { name: spec.name },
      update: {
        unit: spec.unit ?? null,
        isCountable: spec.isCountable,
        lowStockThreshold: spec.lowStockThreshold ?? null,
        sortOrder: spec.sortOrder,
      },
      create: {
        name: spec.name,
        unit: spec.unit ?? null,
        isCountable: spec.isCountable,
        quantityOnHand: spec.quantityOnHand,
        lowStockThreshold: spec.lowStockThreshold ?? null,
        sortOrder: spec.sortOrder,
      },
    });
  }

  const chickenLeg = await upsertItem({
    name: 'Chicken leg',
    unit: 'pc',
    isCountable: true,
    quantityOnHand: 50,
    lowStockThreshold: 10,
    sortOrder: 0,
  });
  const grilledCorn = await upsertItem({
    name: 'Grilled corn',
    unit: 'pc',
    isCountable: true,
    quantityOnHand: 40,
    lowStockThreshold: 8,
    sortOrder: 1,
  });
  await upsertItem({
    name: 'BBQ sauce',
    unit: 'batch',
    isCountable: false,
    quantityOnHand: 0,
    sortOrder: 2,
  });
  await upsertItem({
    name: 'Fries',
    unit: 'batch',
    isCountable: false,
    quantityOnHand: 0,
    sortOrder: 3,
  });

  async function setRecipe(
    productName: string,
    links: Array<{ itemId: string; qty: number }>,
  ) {
    const product = await prisma.posProduct.findFirst({
      where: { name: productName },
    });
    if (!product) return;

    await prisma.posProductIngredient.deleteMany({
      where: { productId: product.id },
    });

    for (const link of links) {
      await prisma.posProductIngredient.create({
        data: {
          productId: product.id,
          inventoryItemId: link.itemId,
          quantityPerUnit: link.qty,
        },
      });
    }
  }

  await setRecipe('Solo Combo', [
    { itemId: chickenLeg.id, qty: 1 },
    { itemId: grilledCorn.id, qty: 1 },
  ]);
  await setRecipe('Street Box', [
    { itemId: chickenLeg.id, qty: 1 },
    { itemId: grilledCorn.id, qty: 1 },
  ]);
  await setRecipe('Whole Leg', [{ itemId: chickenLeg.id, qty: 2 }]);
  await setRecipe('Chicken Wings', [{ itemId: chickenLeg.id, qty: 1 }]);

  console.log('Weekend Grills POS inventory seed completed');
}
