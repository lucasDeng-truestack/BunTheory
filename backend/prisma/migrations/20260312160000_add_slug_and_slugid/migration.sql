-- Add slug to Menu (nullable first, then backfill, then make required)
ALTER TABLE "Menu" ADD COLUMN "slug" TEXT;

-- Backfill slugs from name: lowercase, replace spaces with hyphens, remove special chars
UPDATE "Menu" SET "slug" = REGEXP_REPLACE(REGEXP_REPLACE(LOWER("name"), '\s+', '-', 'g'), '[^a-z0-9-]', '', 'g')
WHERE "slug" IS NULL;

-- Handle any edge cases - use id as fallback
UPDATE "Menu" SET "slug" = 'menu-' || "id" WHERE "slug" IS NULL OR "slug" = '';

-- Make slug required and unique
ALTER TABLE "Menu" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Menu_slug_key" ON "Menu"("slug");

-- Add slugId to Order (nullable first, then backfill, then make required)
ALTER TABLE "Order" ADD COLUMN "slugId" TEXT;

-- Backfill slugId for existing orders: BT-{id} ensures uniqueness
UPDATE "Order" SET "slugId" = 'BT-' || "id" WHERE "slugId" IS NULL;

-- Make slugId required and unique
ALTER TABLE "Order" ALTER COLUMN "slugId" SET NOT NULL;
CREATE UNIQUE INDEX "Order_slugId_key" ON "Order"("slugId");
