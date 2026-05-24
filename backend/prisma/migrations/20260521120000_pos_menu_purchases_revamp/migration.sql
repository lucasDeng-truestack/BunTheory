-- Weekend Grills POS menu + purchases revamp (destructive: clears POS orders & old menu/inventory)

DELETE FROM "PosOrderItem";
DELETE FROM "PosOrder";

ALTER TABLE "PosOrderItem" DROP CONSTRAINT IF EXISTS "PosOrderItem_menuItemId_fkey";
ALTER TABLE "PosOrderItem" DROP COLUMN IF EXISTS "menuItemId";

DROP TABLE IF EXISTS "PosRecipeIngredient";
DROP TABLE IF EXISTS "InventoryStockMovement";
DROP TABLE IF EXISTS "InventoryPurchase";
DROP TABLE IF EXISTS "InventoryItem";
DROP TABLE IF EXISTS "PosMenuItem";
DROP TABLE IF EXISTS "PosMenuSectionHeader";
DROP TABLE IF EXISTS "PosCategory";

DROP TYPE IF EXISTS "InventoryUnit";
DROP TYPE IF EXISTS "InventoryMovementType";
DROP TYPE IF EXISTS "PosMenuItemKind";

CREATE TYPE "PosProductType" AS ENUM ('COMBO', 'VARIANT', 'SIMPLE');
CREATE TYPE "PosOrderLineType" AS ENUM ('COMBO', 'VARIANT', 'SIMPLE');

ALTER TABLE "PosOrderItem" ADD COLUMN "lineType" "PosOrderLineType" NOT NULL;
ALTER TABLE "PosOrderItem" ADD COLUMN "productId" TEXT;
ALTER TABLE "PosOrderItem" ADD COLUMN "variantId" TEXT;
ALTER TABLE "PosOrderItem" ADD COLUMN "displayName" TEXT NOT NULL;
ALTER TABLE "PosOrderItem" ADD COLUMN "choicesSummary" TEXT;
ALTER TABLE "PosOrderItem" ADD COLUMN "choicesJson" JSONB;

CREATE TABLE "PosMenuSection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosMenuSection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosProduct" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "type" "PosProductType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosProductVariant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosCombo" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "includesText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosCombo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosComboSlot" (
    "id" TEXT NOT NULL,
    "comboId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosComboSlot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosComboSlotOption" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "priceDelta" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosComboSlotOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosPurchase" (
    "id" TEXT NOT NULL,
    "remark" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PosPurchase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PosCombo_productId_key" ON "PosCombo"("productId");
CREATE INDEX "PosMenuSection_sortOrder_idx" ON "PosMenuSection"("sortOrder");
CREATE INDEX "PosProduct_sectionId_sortOrder_idx" ON "PosProduct"("sectionId", "sortOrder");
CREATE INDEX "PosProductVariant_productId_sortOrder_idx" ON "PosProductVariant"("productId", "sortOrder");
CREATE INDEX "PosComboSlot_comboId_sortOrder_idx" ON "PosComboSlot"("comboId", "sortOrder");
CREATE INDEX "PosComboSlotOption_slotId_sortOrder_idx" ON "PosComboSlotOption"("slotId", "sortOrder");
CREATE INDEX "PosOrderItem_productId_idx" ON "PosOrderItem"("productId");
CREATE INDEX "PosOrderItem_orderId_idx" ON "PosOrderItem"("orderId");
CREATE INDEX "PosPurchase_purchasedAt_idx" ON "PosPurchase"("purchasedAt");

ALTER TABLE "PosProduct" ADD CONSTRAINT "PosProduct_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "PosMenuSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PosProductVariant" ADD CONSTRAINT "PosProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "PosProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PosCombo" ADD CONSTRAINT "PosCombo_productId_fkey" FOREIGN KEY ("productId") REFERENCES "PosProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PosComboSlot" ADD CONSTRAINT "PosComboSlot_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "PosCombo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PosComboSlotOption" ADD CONSTRAINT "PosComboSlotOption_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "PosComboSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PosOrderItem" ADD CONSTRAINT "PosOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "PosProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PosOrderItem" ADD CONSTRAINT "PosOrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "PosProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PosPurchase" ADD CONSTRAINT "PosPurchase_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
