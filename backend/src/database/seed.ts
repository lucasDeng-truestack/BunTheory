import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // ─── Admin ────────────────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('Lucas@123', 10);

  const admin = await prisma.admin.upsert({
    where: { email: 'denglucasyijin@gmail.com' },
    update: { displayName: 'Lucas Deng' },
    create: {
      email: 'denglucasyijin@gmail.com',
      password: hashedPassword,
      displayName: 'Lucas Deng',
    },
  });

  // ─── System Settings ──────────────────────────────────────────────────────
  let settings = await prisma.systemSettings.findFirst();
  if (!settings) {
    settings = await prisma.systemSettings.create({
      data: {
        maxOrdersPerDay: 15,
        orderingEnabled: true,
        minimumDeliveryAmount: 15,
      },
    });
  }

  // ─── Bun Theory Menu ─────────────────────────────────────────────────────
  const menuItems = [
    {
      slug: 'signature-roast-bun',
      name: 'Signature Roast Bun',
      description: 'Our famous slow-roasted beef in a soft artisan bun',
      price: 12,
      available: true,
    },
    {
      slug: 'classic-cheese-bun',
      name: 'Classic Cheese Bun',
      description: 'Melted cheddar with our house sauce',
      price: 10,
      available: true,
    },
    {
      slug: 'spicy-jalapeno-bun',
      name: 'Spicy Jalapeño Bun',
      description: 'Roasted jalapeños with chipotle mayo',
      price: 11,
      available: true,
    },
  ];

  const drinksGroup = {
    name: 'Drinks',
    required: true,
    multiSelect: false,
    options: [
      { label: 'Sprite', priceDelta: 0 },
      { label: 'Coke', priceDelta: 0 },
      { label: 'Ice Lemon Tea', priceDelta: 0 },
    ],
  } as const;

  for (const item of menuItems) {
    const menu = await prisma.menu.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        description: item.description,
        price: item.price,
        available: item.available,
      },
      create: {
        slug: item.slug,
        name: item.name,
        description: item.description,
        price: item.price,
        available: item.available,
      },
    });

    await prisma.menuOptionGroup.deleteMany({ where: { menuId: menu.id } });

    await prisma.menuOptionGroup.create({
      data: {
        menuId: menu.id,
        sortOrder: 0,
        name: drinksGroup.name,
        required: drinksGroup.required,
        multiSelect: drinksGroup.multiSelect,
        options: {
          create: drinksGroup.options.map((opt, index) => ({
            sortOrder: index,
            label: opt.label,
            priceDelta: opt.priceDelta,
          })),
        },
      },
    });
  }

  // ─── Weekend Grills POS ───────────────────────────────────────────────────
  console.log('Seeding Weekend Grills POS data...');

  const pillarSpecs = [
    { name: 'Mains', sortOrder: 0, legacyNames: ['Main Course'] as const },
    { name: 'Sides', sortOrder: 1, legacyNames: [] as const },
    { name: 'Drinks', sortOrder: 2, legacyNames: [] as const },
  ] as const;

  type PosPillar = (typeof pillarSpecs)[number]['name'];

  const catByPillar = new Map<PosPillar, string>();

  for (const spec of pillarSpecs) {
    let cat = await prisma.posCategory.findFirst({
      where: { name: spec.name },
    });
    if (!cat) {
      for (const legacy of spec.legacyNames) {
        const legacyRow = await prisma.posCategory.findFirst({
          where: { name: legacy },
        });
        if (legacyRow) {
          cat = await prisma.posCategory.update({
            where: { id: legacyRow.id },
            data: { name: spec.name, sortOrder: spec.sortOrder },
          });
          break;
        }
      }
    }
    if (!cat) {
      cat = await prisma.posCategory.create({
        data: { name: spec.name, sortOrder: spec.sortOrder },
      });
    } else if (cat.sortOrder !== spec.sortOrder) {
      cat = await prisma.posCategory.update({
        where: { id: cat.id },
        data: { sortOrder: spec.sortOrder },
      });
    }
    catByPillar.set(spec.name, cat.id);
  }

  async function ensureSectionHeader(
    categoryId: string,
    title: string,
    subtitle: string | null,
    sortOrder: number,
  ): Promise<string> {
    const existing = await prisma.posMenuSectionHeader.findFirst({
      where: { categoryId, title },
    });
    if (existing) {
      await prisma.posMenuSectionHeader.update({
        where: { id: existing.id },
        data: { subtitle, sortOrder },
      });
      return existing.id;
    }
    const row = await prisma.posMenuSectionHeader.create({
      data: { categoryId, title, subtitle, sortOrder },
    });
    return row.id;
  }

  type PosSeedItem = {
    name: string;
    description: string;
    price: number;
    pillar: PosPillar;
    kind: 'MAIN_MEAL' | 'SIDE' | 'DRINK_ADDON';
    headerTitle: string;
    headerSubtitle: string | null;
    headerSort: number;
    sortOrder: number;
  };

  const posMenuItems: PosSeedItem[] = [
    {
      name: 'Chicken Wings',
      description: 'Crispy grilled wings with BBQ glaze',
      price: 20,
      pillar: 'Sides',
      kind: 'SIDE',
      headerTitle: 'Starters & snacks',
      headerSubtitle: 'Share plates & lighter bites',
      headerSort: 0,
      sortOrder: 0,
    },
    {
      name: 'French Fries',
      description: 'Seasoned thick-cut fries',
      price: 5,
      pillar: 'Sides',
      kind: 'SIDE',
      headerTitle: 'Classic sides',
      headerSubtitle: null,
      headerSort: 1,
      sortOrder: 1,
    },
    {
      name: 'Summer Salad',
      description: 'Fresh greens with citrus dressing',
      price: 10,
      pillar: 'Sides',
      kind: 'SIDE',
      headerTitle: 'Classic sides',
      headerSubtitle: null,
      headerSort: 1,
      sortOrder: 2,
    },
    {
      name: 'Grilled Lamb Chop',
      description: 'Tender lamb chop with rosemary rub and mint sauce',
      price: 35,
      pillar: 'Mains',
      kind: 'MAIN_MEAL',
      headerTitle: 'Meal selection',
      headerSubtitle: 'Charcoal grills & signatures',
      headerSort: 0,
      sortOrder: 0,
    },
    {
      name: 'BBQ Beef Ribs',
      description: 'Slow-smoked beef ribs with house BBQ sauce',
      price: 38,
      pillar: 'Mains',
      kind: 'MAIN_MEAL',
      headerTitle: 'Meal selection',
      headerSubtitle: 'Charcoal grills & signatures',
      headerSort: 0,
      sortOrder: 1,
    },
    {
      name: 'Grilled Chicken Thigh',
      description: 'Marinated chicken thigh, charcoal grilled',
      price: 22,
      pillar: 'Mains',
      kind: 'MAIN_MEAL',
      headerTitle: 'Meal selection',
      headerSubtitle: 'Charcoal grills & signatures',
      headerSort: 0,
      sortOrder: 2,
    },
    {
      name: 'Beef Burger',
      description: 'Handmade beef patty with caramelised onions',
      price: 25,
      pillar: 'Mains',
      kind: 'MAIN_MEAL',
      headerTitle: 'Meal selection',
      headerSubtitle: 'Charcoal grills & signatures',
      headerSort: 0,
      sortOrder: 3,
    },
    {
      name: 'Tropical Lemonade',
      description: 'Fresh lime and passion fruit blend',
      price: 8,
      pillar: 'Drinks',
      kind: 'DRINK_ADDON',
      headerTitle: 'Cold drinks',
      headerSubtitle: null,
      headerSort: 0,
      sortOrder: 10,
    },
    {
      name: 'Iced Milo',
      description: 'Classic Malaysian chocolate malt',
      price: 6,
      pillar: 'Drinks',
      kind: 'DRINK_ADDON',
      headerTitle: 'Cold drinks',
      headerSubtitle: null,
      headerSort: 0,
      sortOrder: 11,
    },
    {
      name: 'Coconut Water',
      description: 'Fresh young coconut water',
      price: 7,
      pillar: 'Drinks',
      kind: 'DRINK_ADDON',
      headerTitle: 'Cold drinks',
      headerSubtitle: null,
      headerSort: 0,
      sortOrder: 12,
    },
    {
      name: 'Grilled Banana',
      description: 'Caramelised banana with chocolate drizzle',
      price: 10,
      pillar: 'Sides',
      kind: 'SIDE',
      headerTitle: 'Sweet bites',
      headerSubtitle: null,
      headerSort: 2,
      sortOrder: 20,
    },
    {
      name: 'Ice Cream Scoop',
      description: 'Vanilla, chocolate or mango',
      price: 6,
      pillar: 'Sides',
      kind: 'SIDE',
      headerTitle: 'Sweet bites',
      headerSubtitle: null,
      headerSort: 2,
      sortOrder: 21,
    },
  ];

  const headerDone = new Set<string>();
  for (const item of posMenuItems) {
    const categoryId = catByPillar.get(item.pillar)!;
    const key = `${categoryId}::${item.headerTitle}`;
    if (headerDone.has(key)) continue;
    headerDone.add(key);
    await ensureSectionHeader(
      categoryId,
      item.headerTitle,
      item.headerSubtitle,
      item.headerSort,
    );
  }

  const createdMenuItems = new Map<string, { id: string; price: number }>();

  for (const item of posMenuItems) {
    const categoryId = catByPillar.get(item.pillar)!;
    const header = await prisma.posMenuSectionHeader.findFirst({
      where: { categoryId, title: item.headerTitle },
    });
    const sectionHeaderId = header?.id ?? null;

    const existing = await prisma.posMenuItem.findFirst({
      where: { name: item.name },
    });

    const baseData = {
      description: item.description,
      price: item.price,
      categoryId,
      kind: item.kind,
      sectionHeaderId,
      sortOrder: item.sortOrder,
      available: true,
    };

    if (existing) {
      await prisma.posMenuItem.update({
        where: { id: existing.id },
        data: baseData,
      });
      createdMenuItems.set(item.name, {
        id: existing.id,
        price: item.price,
      });
      continue;
    }
    const created = await prisma.posMenuItem.create({
      data: {
        name: item.name,
        ...baseData,
      },
    });
    createdMenuItems.set(item.name, { id: created.id, price: item.price });
  }

  // Inventory Items
  const inventoryItems = [
    { name: 'Chicken Wings (raw)', unit: 'KG' as const, lowStockThreshold: 2 },
    { name: 'Beef Ribs (raw)', unit: 'KG' as const, lowStockThreshold: 3 },
    { name: 'Lamb Chop (raw)', unit: 'KG' as const, lowStockThreshold: 2 },
    { name: 'Ground Beef', unit: 'KG' as const, lowStockThreshold: 2 },
    { name: 'Potatoes', unit: 'KG' as const, lowStockThreshold: 5 },
    { name: 'Mixed Salad Greens', unit: 'KG' as const, lowStockThreshold: 1 },
    { name: 'Burger Buns', unit: 'PIECE' as const, lowStockThreshold: 20 },
    { name: 'Cooking Oil', unit: 'LITER' as const, lowStockThreshold: 3 },
    { name: 'BBQ Sauce', unit: 'LITER' as const, lowStockThreshold: 1 },
    { name: 'Charcoal', unit: 'KG' as const, lowStockThreshold: 5 },
    { name: 'Bananas', unit: 'KG' as const, lowStockThreshold: 2 },
    { name: 'Ice Cream (Vanilla)', unit: 'LITER' as const, lowStockThreshold: 2 },
    { name: 'Lime', unit: 'KG' as const, lowStockThreshold: 1 },
    { name: 'Milo Powder', unit: 'KG' as const, lowStockThreshold: 1 },
  ];

  const invMap = new Map<string, string>();
  for (const inv of inventoryItems) {
    const existing = await prisma.inventoryItem.findFirst({
      where: { name: inv.name },
    });
    if (existing) {
      invMap.set(inv.name, existing.id);
      continue;
    }
    const created = await prisma.inventoryItem.create({
      data: {
        name: inv.name,
        unit: inv.unit,
        lowStockThreshold: inv.lowStockThreshold,
      },
    });
    invMap.set(inv.name, created.id);
  }

  // Seed initial inventory purchases
  const purchases = [
    { item: 'Chicken Wings (raw)', qty: 10, cost: 80 },
    { item: 'Beef Ribs (raw)', qty: 8, cost: 120 },
    { item: 'Lamb Chop (raw)', qty: 5, cost: 100 },
    { item: 'Ground Beef', qty: 5, cost: 60 },
    { item: 'Potatoes', qty: 15, cost: 30 },
    { item: 'Mixed Salad Greens', qty: 3, cost: 15 },
    { item: 'Burger Buns', qty: 50, cost: 25 },
    { item: 'Cooking Oil', qty: 10, cost: 50 },
    { item: 'BBQ Sauce', qty: 3, cost: 36 },
    { item: 'Charcoal', qty: 20, cost: 40 },
    { item: 'Bananas', qty: 5, cost: 10 },
    { item: 'Ice Cream (Vanilla)', qty: 5, cost: 40 },
    { item: 'Lime', qty: 3, cost: 9 },
    { item: 'Milo Powder', qty: 2, cost: 16 },
  ];

  for (const p of purchases) {
    const itemId = invMap.get(p.item);
    if (!itemId) continue;
    const existingPurchase = await prisma.inventoryPurchase.findFirst({
      where: { itemId },
    });
    if (existingPurchase) continue;

    await prisma.inventoryPurchase.create({
      data: {
        itemId,
        quantity: p.qty,
        totalCost: p.cost,
        supplierName: 'Opening Stock',
        notes: 'Initial bazaar purchase',
      },
    });

    await prisma.inventoryStockMovement.create({
      data: {
        itemId,
        type: 'PURCHASE',
        quantityChange: p.qty,
        unitCost: p.cost / p.qty,
        notes: 'Opening stock purchase',
      },
    });
  }

  // Sample POS orders (so the dashboard has data to display)
  const sampleOrders = [
    {
      customerName: 'Amir',
      serviceType: 'EAT_HERE' as const,
      paymentMethod: 'CASH' as const,
      status: 'COMPLETED' as const,
      items: [
        { name: 'Chicken Wings', qty: 1 },
        { name: 'Summer Salad', qty: 2 },
        { name: 'French Fries', qty: 1 },
      ],
    },
    {
      customerName: 'Sarah',
      serviceType: 'TAKEAWAY' as const,
      paymentMethod: 'QR' as const,
      status: 'COMPLETED' as const,
      items: [
        { name: 'BBQ Beef Ribs', qty: 1 },
        { name: 'Tropical Lemonade', qty: 2 },
      ],
    },
    {
      customerName: 'Wei Ming',
      serviceType: 'EAT_HERE' as const,
      paymentMethod: 'CASH' as const,
      status: 'PREPARING' as const,
      items: [
        { name: 'Grilled Lamb Chop', qty: 1 },
        { name: 'Iced Milo', qty: 1 },
      ],
    },
    {
      customerName: 'Nurul',
      serviceType: 'TAKEAWAY' as const,
      paymentMethod: 'QR' as const,
      status: 'PLACED' as const,
      items: [
        { name: 'Beef Burger', qty: 2 },
        { name: 'French Fries', qty: 2 },
        { name: 'Coconut Water', qty: 2 },
      ],
    },
    {
      customerName: 'Raj',
      serviceType: 'EAT_HERE' as const,
      paymentMethod: 'CASH' as const,
      status: 'READY' as const,
      items: [
        { name: 'Grilled Chicken Thigh', qty: 2 },
        { name: 'Grilled Banana', qty: 1 },
      ],
    },
  ];

  const existingPosOrders = await prisma.posOrder.count();
  if (existingPosOrders === 0) {
    let orderSeq = 1;
    for (const order of sampleOrders) {
      const orderItems = order.items
        .map((oi) => {
          const mi = createdMenuItems.get(oi.name);
          if (!mi) return null;
          return {
            menuItemId: mi.id,
            quantity: oi.qty,
            unitPrice: mi.price,
          };
        })
        .filter(Boolean) as Array<{
        menuItemId: string;
        quantity: number;
        unitPrice: number;
      }>;

      const subtotal = orderItems.reduce(
        (sum, oi) => sum + oi.unitPrice * oi.quantity,
        0,
      );

      const now = new Date();
      const timestamps: Record<string, Date | undefined> = {};
      if (
        order.status === 'PREPARING' ||
        order.status === 'READY' ||
        order.status === 'COMPLETED'
      ) {
        timestamps.startedAt = new Date(now.getTime() - 20 * 60_000);
      }
      if (order.status === 'READY' || order.status === 'COMPLETED') {
        timestamps.readyAt = new Date(now.getTime() - 10 * 60_000);
      }
      if (order.status === 'COMPLETED') {
        timestamps.completedAt = new Date(now.getTime() - 5 * 60_000);
        timestamps.paidAt = new Date(now.getTime() - 25 * 60_000);
      }

      await prisma.posOrder.create({
        data: {
          orderNumber: `WG-${String(orderSeq).padStart(4, '0')}`,
          customerName: order.customerName,
          serviceType: order.serviceType,
          paymentMethod: order.paymentMethod,
          status: order.status,
          paymentStatus:
            order.status === 'COMPLETED' ? 'PAID' : 'UNPAID',
          subtotal,
          total: subtotal,
          createdByAdminId: admin.id,
          ...timestamps,
          orderItems: {
            create: orderItems,
          },
        },
      });
      orderSeq++;
    }
    console.log(`  Created ${sampleOrders.length} sample POS orders`);
  }

  console.log('Seed completed:', {
    admin: admin.email,
    posPillars: pillarSpecs.length,
    posMenuItems: posMenuItems.length,
    inventoryItems: inventoryItems.length,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
