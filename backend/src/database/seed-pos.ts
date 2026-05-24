import { PrismaClient } from '@prisma/client';
import { seedPosMenu } from './seed-pos-menu';

const prisma = new PrismaClient();

/**
 * Production-safe seed for Weekend Grills POS only.
 *
 * Does NOT touch Bun Theory tables (Menu, Order, SystemSettings, Admin, etc.).
 * Idempotent: upserts menu by section + product name; sample purchases only if empty.
 *
 * Usage:
 *   DATABASE_URL="postgres://..." npm run db:seed:pos
 */
async function main() {
  await seedPosMenu(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
