import { PrismaClient, OrderBatchStatus } from '@prisma/client';
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
      data: { maxOrdersPerDay: 15, orderingEnabled: true },
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

  for (const item of menuItems) {
    await prisma.menu.upsert({
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
  }

  const existingBatch = await prisma.orderBatch.findFirst({
    where: { label: 'Development seed batch' },
  });
  if (!existingBatch) {
    const menus = await prisma.menu.findMany();
    const now = new Date();
    const opensAt = new Date(now);
    opensAt.setDate(opensAt.getDate() - 1);
    const closesAt = new Date(now);
    closesAt.setDate(closesAt.getDate() + 14);
    const fulfillmentDate = new Date(now);
    fulfillmentDate.setDate(fulfillmentDate.getDate() + 7);

    const batch = await prisma.orderBatch.create({
      data: {
        label: 'Development seed batch',
        fulfillmentDate,
        opensAt,
        closesAt,
        maxItems: 50,
        status: OrderBatchStatus.DRAFT,
      },
    });

    await prisma.menuSnapshot.create({
      data: {
        batchId: batch.id,
        items: {
          create: menus.map((m) => ({
            sourceMenuId: m.id,
            slug: m.slug,
            name: m.name,
            description: m.description,
            price: m.price,
            image: m.image,
            available: m.available,
          })),
        },
      },
    });

    await prisma.orderBatch.update({
      where: { id: batch.id },
      data: {
        status: OrderBatchStatus.PUBLISHED,
        publishedAt: new Date(),
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
