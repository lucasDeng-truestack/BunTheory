-- Live menu, categories, options; remove batches/snapshots.

-- New tables
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

CREATE TABLE "MenuCategory" (
    "menuId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    CONSTRAINT "MenuCategory_pkey" PRIMARY KEY ("menuId","categoryId")
);

CREATE TABLE "MenuOptionGroup" (
    "id" TEXT NOT NULL,
    "menuId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "multiSelect" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "MenuOptionGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MenuOption" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT NOT NULL,
    "priceDelta" DECIMAL(10,2) NOT NULL DEFAULT 0,
    CONSTRAINT "MenuOption_pkey" PRIMARY KEY ("id")
);

-- Menu / settings
ALTER TABLE "Menu" ADD COLUMN "maxQuantity" INTEGER;
ALTER TABLE "Menu" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "SystemSettings" ADD COLUMN "minimumDeliveryAmount" DECIMAL(10,2);

-- OrderItem extensions (nullable first for backfill)
ALTER TABLE "OrderItem" ADD COLUMN "remarks" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "unitPrice" DECIMAL(10,2);
ALTER TABLE "OrderItem" ADD COLUMN "selectedOptions" JSONB;

-- Backfill unitPrice from snapshot lines
UPDATE "OrderItem" oi
SET "unitPrice" = msi."price"
FROM "MenuSnapshotItem" msi
WHERE oi."menuSnapshotItemId" = msi."id" AND oi."unitPrice" IS NULL;

-- Backfill menuId from snapshot
UPDATE "OrderItem" oi
SET "menuId" = msi."sourceMenuId"
FROM "MenuSnapshotItem" msi
WHERE oi."menuSnapshotItemId" = msi."id" AND oi."menuId" IS NULL AND msi."sourceMenuId" IS NOT NULL;

UPDATE "OrderItem" oi
SET "menuId" = m."id"
FROM "MenuSnapshotItem" msi
INNER JOIN "Menu" m ON m."slug" = msi."slug"
WHERE oi."menuSnapshotItemId" = msi."id" AND oi."menuId" IS NULL;

-- Backfill unitPrice from Menu when still null
UPDATE "OrderItem" oi
SET "unitPrice" = m."price"
FROM "Menu" m
WHERE oi."menuId" = m."id" AND oi."unitPrice" IS NULL;

UPDATE "OrderItem" SET "unitPrice" = 0 WHERE "unitPrice" IS NULL;

-- Remove orphan order lines that cannot be tied to a menu row
DELETE FROM "OrderItem" WHERE "menuId" IS NULL;

ALTER TABLE "OrderItem" ALTER COLUMN "menuId" SET NOT NULL;
ALTER TABLE "OrderItem" ALTER COLUMN "unitPrice" SET NOT NULL;

-- Drop snapshot FK and column on OrderItem
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_menuSnapshotItemId_fkey";
ALTER TABLE "OrderItem" DROP COLUMN "menuSnapshotItemId";

-- Order batchId
ALTER TABLE "Order" DROP CONSTRAINT "Order_batchId_fkey";
ALTER TABLE "Order" DROP COLUMN "batchId";

-- Drop batch tables (snapshot first)
DROP TABLE "MenuSnapshotItem";
DROP TABLE "MenuSnapshot";
DROP TABLE "OrderBatch";
DROP TYPE "OrderBatchStatus";

-- FKs for new tables
ALTER TABLE "MenuCategory" ADD CONSTRAINT "MenuCategory_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MenuCategory" ADD CONSTRAINT "MenuCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MenuOptionGroup" ADD CONSTRAINT "MenuOptionGroup_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MenuOption" ADD CONSTRAINT "MenuOption_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "MenuOptionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enforce OrderItem -> Menu (replace nullable FK)
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_menuId_fkey";
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
