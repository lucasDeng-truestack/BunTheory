import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { seedPosMenu } from './seed-pos-menu';

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
  const outletDefaults = {
    outletName: 'The Bun Theory',
    outletAddress: 'Bakar & Roast, Kuala Lumpur',
    prepTimeMinutes: 30,
    deliveryFee: 5,
    processingFee: 0,
    taxRatePercent: 6,
    deliveryRadiusNote: 'We deliver within ~5 km of the outlet.',
  };

  let settings = await prisma.systemSettings.findFirst();
  if (!settings) {
    settings = await prisma.systemSettings.create({
      data: {
        maxOrdersPerDay: 15,
        orderingEnabled: true,
        minimumDeliveryAmount: 15,
        ...outletDefaults,
      },
    });
  } else {
    // Backfill the new outlet/fee/tax fields on a pre-existing settings row.
    settings = await prisma.systemSettings.update({
      where: { id: settings.id },
      data: {
        outletName: settings.outletName ?? outletDefaults.outletName,
        outletAddress: settings.outletAddress ?? outletDefaults.outletAddress,
        prepTimeMinutes:
          settings.prepTimeMinutes ?? outletDefaults.prepTimeMinutes,
        deliveryFee: settings.deliveryFee ?? outletDefaults.deliveryFee,
        processingFee: settings.processingFee ?? outletDefaults.processingFee,
        deliveryRadiusNote:
          settings.deliveryRadiusNote ?? outletDefaults.deliveryRadiusNote,
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
      category: 'Buns',
    },
    {
      slug: 'classic-cheese-bun',
      name: 'Classic Cheese Bun',
      description: 'Melted cheddar with our house sauce',
      price: 10,
      available: true,
      category: 'Buns',
    },
    {
      slug: 'spicy-jalapeno-bun',
      name: 'Spicy Jalapeño Bun',
      description: 'Roasted jalapeños with chipotle mayo',
      price: 11,
      available: true,
      category: 'Buns',
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
        category: item.category,
      },
      create: {
        slug: item.slug,
        name: item.name,
        description: item.description,
        price: item.price,
        available: item.available,
        category: item.category,
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
  await seedPosMenu(prisma);

  console.log('Seed completed:', {
    admin: admin.email,
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
