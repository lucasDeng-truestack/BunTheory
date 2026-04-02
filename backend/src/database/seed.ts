import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.admin.upsert({
    where: { email: 'admin@buntheory.com' },
    update: {},
    create: {
      email: 'admin@buntheory.com',
      password: hashedPassword,
    },
  });

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

  /** Same drink choices for each seeded item; all +RM 0; group is required (pick one). */
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

  console.log('Seed completed:', { admin: admin.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
