import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { seedPosMenu } from './seed-pos-menu';

const prisma = new PrismaClient();

async function main() {
  // ─── Admin (Better Auth User + credential Account) ────────────────────────
  const adminEmail = 'denglucasyijin@gmail.com';
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { displayName: 'Lucas Deng' },
    create: {
      id: randomUUID(),
      email: adminEmail,
      displayName: 'Lucas Deng',
      emailVerified: true,
      role: 'OWNER',
    },
  });
  // Never overwrite an existing password: only create the credential account when missing.
  const credential = await prisma.account.findFirst({
    where: { userId: admin.id, providerId: 'credential' },
    select: { id: true },
  });
  if (!credential) {
    await prisma.account.create({
      data: {
        id: randomUUID(),
        accountId: admin.id,
        providerId: 'credential',
        userId: admin.id,
        password: await bcrypt.hash('Lucas@123', 10),
      },
    });
  }

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

  // ─── Bakar & Roast catering: sample packages (PLACEHOLDER content, edit in admin) ───
  if ((await prisma.cateringPackage.count()) === 0) {
    await prisma.cateringPackage.createMany({
      data: [
        {
          name: 'The Gathering',
          tagline: 'Smoked chicken and sides for the house.',
          description:
            'Our apple-wood roast chicken with fire-roasted sides. Built for house gatherings and family tables.',
          includes: ['Apple-wood roast chicken', 'Two fire-roasted sides', 'House sauces', 'Bread and pickles', 'Setup and serving ware', 'One cook on site'],
          minGuests: 20,
          maxGuests: 40,
          sortOrder: 0,
        },
        {
          name: 'The Feast',
          tagline: 'The full fire, carved at the table.',
          description:
            'Roast chicken and a second meat with sides, carved to order. Made for celebrations.',
          includes: ['Roast chicken and a second meat', 'Three sides', 'Salad and bread', 'House sauces', 'Carving station', 'Two cooks on site'],
          minGuests: 20,
          maxGuests: 80,
          sortOrder: 1,
        },
        {
          name: 'The Big Fire',
          tagline: 'Live grill for a crowd.',
          description:
            'A live wood-fire grill with the whole team on site. For community tables and big occasions.',
          includes: ['Live wood-fire grill', 'Three meats', 'Four sides', 'Dessert', 'Full serving team', 'Setup and clear down'],
          minGuests: 60,
          maxGuests: 150,
          sortOrder: 2,
        },
      ],
    });
  }

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
