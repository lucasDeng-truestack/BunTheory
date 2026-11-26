-- CreateTable
CREATE TABLE "ShopPackage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "includes" TEXT[],
    "images" TEXT[],
    "price" DECIMAL(10,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopPackage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopPackage_active_sortOrder_idx" ON "ShopPackage"("active", "sortOrder");

-- Carry over the three packages that were written in the code (shop.config.ts), with their old
-- keys as ids, so past order items and carts saved in customers' browsers still match.
INSERT INTO "ShopPackage" ("id", "name", "tagline", "description", "includes", "images", "price", "active", "sortOrder", "updatedAt") VALUES
  ('A', 'Package A', 'For a small table', 'A starter spread for a small gathering.', ARRAY['Placeholder item', 'Placeholder item'], ARRAY[]::TEXT[], 88.00, true, 0, CURRENT_TIMESTAMP),
  ('B', 'Package B', 'For the family', 'A fuller spread for the whole family.', ARRAY['Placeholder item', 'Placeholder item', 'Placeholder item'], ARRAY[]::TEXT[], 128.00, true, 1, CURRENT_TIMESTAMP),
  ('C', 'Package C', 'For a crowd', 'The big one, built to feed a crowd.', ARRAY['Placeholder item', 'Placeholder item', 'Placeholder item', 'Placeholder item'], ARRAY[]::TEXT[], 168.00, true, 2, CURRENT_TIMESTAMP);
