import { PrismaClient } from '@prisma/client';
import { seedPosInventory } from './seed-pos-inventory';

/**
 * Seeds Weekend Grills POS menu only.
 * Safe to run in production alongside Bun Theory — touches Pos* tables only.
 */
export async function seedPosMenu(prisma: PrismaClient) {
  console.log('Seeding Weekend Grills POS menu...');

  async function ensureSection(name: string, sortOrder: number) {
    const existing = await prisma.posMenuSection.findFirst({ where: { name } });
    if (existing) {
      return prisma.posMenuSection.update({
        where: { id: existing.id },
        data: { sortOrder },
      });
    }
    return prisma.posMenuSection.create({ data: { name, sortOrder } });
  }

  const combosSection = await ensureSection('Combos', 0);
  const alacarteSection = await ensureSection('À la carte', 1);

  async function upsertComboProduct(
    sectionId: string,
    spec: {
      name: string;
      description: string;
      basePrice: number;
      sortOrder: number;
      includesText?: string;
      slots: Array<{
        label: string;
        sortOrder: number;
        required?: boolean;
        options: Array<{ label: string; priceDelta?: number; sortOrder: number }>;
      }>;
    },
  ) {
    let product = await prisma.posProduct.findFirst({
      where: { sectionId, name: spec.name },
      include: { combo: { include: { slots: { include: { options: true } } } } },
    });

    if (!product) {
      product = await prisma.posProduct.create({
        data: {
          sectionId,
          type: 'COMBO',
          name: spec.name,
          description: spec.description,
          basePrice: spec.basePrice,
          sortOrder: spec.sortOrder,
          available: true,
          combo: {
            create: {
              includesText: spec.includesText ?? null,
              slots: {
                create: spec.slots.map((slot) => ({
                  label: slot.label,
                  sortOrder: slot.sortOrder,
                  required: slot.required ?? true,
                  options: {
                    create: slot.options.map((opt) => ({
                      label: opt.label,
                      priceDelta: opt.priceDelta ?? 0,
                      sortOrder: opt.sortOrder,
                    })),
                  },
                })),
              },
            },
          },
        },
        include: { combo: { include: { slots: { include: { options: true } } } } },
      });
      return product;
    }

    await prisma.posProduct.update({
      where: { id: product.id },
      data: {
        description: spec.description,
        basePrice: spec.basePrice,
        sortOrder: spec.sortOrder,
        available: true,
      },
    });

    if (product.combo) {
      await prisma.posCombo.update({
        where: { id: product.combo.id },
        data: { includesText: spec.includesText ?? null },
      });
      for (const slot of product.combo.slots) {
        await prisma.posComboSlotOption.deleteMany({ where: { slotId: slot.id } });
      }
      await prisma.posComboSlot.deleteMany({ where: { comboId: product.combo.id } });
      for (const slot of spec.slots) {
        await prisma.posComboSlot.create({
          data: {
            comboId: product.combo.id,
            label: slot.label,
            sortOrder: slot.sortOrder,
            required: slot.required ?? true,
            options: {
              create: slot.options.map((opt) => ({
                label: opt.label,
                priceDelta: opt.priceDelta ?? 0,
                sortOrder: opt.sortOrder,
              })),
            },
          },
        });
      }
    }

    return prisma.posProduct.findFirstOrThrow({
      where: { id: product.id },
      include: { combo: { include: { slots: { include: { options: true } } } } },
    });
  }

  async function upsertVariantProduct(
    sectionId: string,
    spec: {
      name: string;
      description: string;
      sortOrder: number;
      variants: Array<{ name: string; price: number; sortOrder: number }>;
    },
  ) {
    let product = await prisma.posProduct.findFirst({
      where: { sectionId, name: spec.name },
      include: { variants: true },
    });

    if (!product) {
      const minPrice = Math.min(...spec.variants.map((v) => v.price));
      product = await prisma.posProduct.create({
        data: {
          sectionId,
          type: 'VARIANT',
          name: spec.name,
          description: spec.description,
          basePrice: minPrice,
          sortOrder: spec.sortOrder,
          available: true,
          variants: {
            create: spec.variants.map((v) => ({
              name: v.name,
              price: v.price,
              sortOrder: v.sortOrder,
            })),
          },
        },
        include: { variants: true },
      });
      return product;
    }

    await prisma.posProduct.update({
      where: { id: product.id },
      data: {
        description: spec.description,
        sortOrder: spec.sortOrder,
        basePrice: Math.min(...spec.variants.map((v) => v.price)),
        available: true,
      },
    });

    await prisma.posProductVariant.deleteMany({ where: { productId: product.id } });
    for (const v of spec.variants) {
      await prisma.posProductVariant.create({
        data: {
          productId: product.id,
          name: v.name,
          price: v.price,
          sortOrder: v.sortOrder,
        },
      });
    }

    return prisma.posProduct.findFirstOrThrow({
      where: { id: product.id },
      include: { variants: true },
    });
  }

  async function upsertSimpleProduct(
    sectionId: string,
    spec: {
      name: string;
      description: string;
      basePrice: number;
      sortOrder: number;
    },
  ) {
    const existing = await prisma.posProduct.findFirst({
      where: { sectionId, name: spec.name },
    });
    if (existing) {
      return prisma.posProduct.update({
        where: { id: existing.id },
        data: {
          description: spec.description,
          basePrice: spec.basePrice,
          sortOrder: spec.sortOrder,
          available: true,
        },
      });
    }
    return prisma.posProduct.create({
      data: {
        sectionId,
        type: 'SIMPLE',
        name: spec.name,
        description: spec.description,
        basePrice: spec.basePrice,
        sortOrder: spec.sortOrder,
        available: true,
      },
    });
  }

  await upsertComboProduct(combosSection.id, {
    name: 'Solo Combo',
    description: 'Protein, side, slaw & sauce — RM15',
    basePrice: 15,
    sortOrder: 0,
    includesText: 'Includes: Slaw',
    slots: [
      {
        label: 'Protein',
        sortOrder: 0,
        options: [
          { label: 'Whole Leg', sortOrder: 0 },
          { label: '3 Wings', sortOrder: 1 },
        ],
      },
      {
        label: 'Side',
        sortOrder: 1,
        options: [
          { label: 'Fries', sortOrder: 0 },
          { label: 'Grilled Corn', sortOrder: 1 },
          { label: 'Loaded Fries', priceDelta: 3, sortOrder: 2 },
        ],
      },
      {
        label: 'Sauce',
        sortOrder: 2,
        options: [
          { label: 'Spicy', sortOrder: 0 },
          { label: 'Non-Spicy', sortOrder: 1 },
        ],
      },
    ],
  });

  await upsertComboProduct(combosSection.id, {
    name: 'Street Box',
    description: 'Loaded fries, corn, slaw & sauce — RM23',
    basePrice: 23,
    sortOrder: 1,
    includesText: 'Includes: Loaded Fries, Grilled Corn, Slaw',
    slots: [
      {
        label: 'Protein',
        sortOrder: 0,
        options: [
          { label: 'Whole Leg', sortOrder: 0 },
          { label: '3 Wings', sortOrder: 1 },
        ],
      },
      {
        label: 'Sauce',
        sortOrder: 1,
        options: [
          { label: 'Spicy', sortOrder: 0 },
          { label: 'Non-Spicy', sortOrder: 1 },
        ],
      },
    ],
  });

  await upsertVariantProduct(alacarteSection.id, {
    name: 'Chicken Wings',
    description: 'Crispy smoked wings',
    sortOrder: 0,
    variants: [
      { name: '3 pcs', price: 12, sortOrder: 0 },
      { name: '6 pcs', price: 22, sortOrder: 1 },
      { name: '12 pcs', price: 36, sortOrder: 2 },
    ],
  });

  await upsertVariantProduct(alacarteSection.id, {
    name: 'Whole Leg',
    description: 'Charcoal-grilled whole leg',
    sortOrder: 1,
    variants: [
      { name: '2 pcs', price: 16, sortOrder: 0 },
      { name: '3 pcs', price: 24, sortOrder: 1 },
    ],
  });

  await upsertSimpleProduct(alacarteSection.id, {
    name: 'Loaded Fries',
    description: 'Fries topped with cheese & sauce',
    basePrice: 9,
    sortOrder: 2,
  });

  await upsertSimpleProduct(alacarteSection.id, {
    name: 'Grilled Corn',
    description: '2 pcs grilled corn',
    basePrice: 6,
    sortOrder: 3,
  });

  const purchaseCount = await prisma.posPurchase.count();
  if (purchaseCount === 0) {
    await prisma.posPurchase.createMany({
      data: [
        { remark: 'Charcoal supply', amount: 45, purchasedAt: new Date() },
        { remark: 'Chicken wings wholesale', amount: 120, purchasedAt: new Date() },
      ],
    });
  }

  await seedPosInventory(prisma);

  const productCount = await prisma.posProduct.count();
  console.log('Weekend Grills POS seed completed:', {
    sections: 2,
    products: productCount,
  });
}
