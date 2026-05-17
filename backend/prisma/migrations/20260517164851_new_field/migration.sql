-- CreateEnum
CREATE TYPE "PosServiceType" AS ENUM ('EAT_HERE', 'TAKEAWAY');

-- CreateEnum
CREATE TYPE "PosPaymentMethod" AS ENUM ('CASH', 'QR');

-- CreateEnum
CREATE TYPE "PosPaymentStatus" AS ENUM ('UNPAID', 'PAID', 'REFUNDED', 'VOIDED');

-- CreateEnum
CREATE TYPE "PosOrderStatus" AS ENUM ('PLACED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InventoryUnit" AS ENUM ('GRAM', 'KG', 'ML', 'LITER', 'PIECE', 'PACK');

-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('PURCHASE', 'SALE_USAGE', 'WASTE', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "PosCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PosCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosMenuItem" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "image" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosMenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosModifierGroup" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "multiSelect" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PosModifierGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosModifier" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "priceDelta" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PosModifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "serviceType" "PosServiceType" NOT NULL,
    "status" "PosOrderStatus" NOT NULL DEFAULT 'PLACED',
    "paymentMethod" "PosPaymentMethod" NOT NULL,
    "paymentStatus" "PosPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdByAdminId" TEXT,
    "paidByAdminId" TEXT,
    "paidAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "remarks" TEXT,

    CONSTRAINT "PosOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosOrderItemModifier" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "modifierId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "priceDelta" DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "PosOrderItemModifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" "InventoryUnit" NOT NULL,
    "lowStockThreshold" DECIMAL(10,3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryPurchase" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "totalCost" DECIMAL(10,2) NOT NULL,
    "supplierName" TEXT,
    "notes" TEXT,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryStockMovement" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "type" "InventoryMovementType" NOT NULL,
    "quantityChange" DECIMAL(10,3) NOT NULL,
    "unitCost" DECIMAL(10,4),
    "referenceOrderId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryStockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosRecipeIngredient" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantityUsed" DECIMAL(10,3) NOT NULL,
    "unit" "InventoryUnit" NOT NULL,

    CONSTRAINT "PosRecipeIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PosOrder_orderNumber_key" ON "PosOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "PosOrder_status_idx" ON "PosOrder"("status");

-- CreateIndex
CREATE INDEX "PosOrder_createdAt_idx" ON "PosOrder"("createdAt");

-- CreateIndex
CREATE INDEX "InventoryPurchase_itemId_idx" ON "InventoryPurchase"("itemId");

-- CreateIndex
CREATE INDEX "InventoryPurchase_purchasedAt_idx" ON "InventoryPurchase"("purchasedAt");

-- CreateIndex
CREATE INDEX "InventoryStockMovement_itemId_idx" ON "InventoryStockMovement"("itemId");

-- CreateIndex
CREATE INDEX "InventoryStockMovement_type_idx" ON "InventoryStockMovement"("type");

-- CreateIndex
CREATE INDEX "InventoryStockMovement_referenceOrderId_idx" ON "InventoryStockMovement"("referenceOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "PosRecipeIngredient_menuItemId_inventoryItemId_key" ON "PosRecipeIngredient"("menuItemId", "inventoryItemId");

-- AddForeignKey
ALTER TABLE "PosMenuItem" ADD CONSTRAINT "PosMenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PosCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosModifierGroup" ADD CONSTRAINT "PosModifierGroup_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "PosMenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosModifier" ADD CONSTRAINT "PosModifier_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "PosModifierGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosOrder" ADD CONSTRAINT "PosOrder_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosOrder" ADD CONSTRAINT "PosOrder_paidByAdminId_fkey" FOREIGN KEY ("paidByAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosOrderItem" ADD CONSTRAINT "PosOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PosOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosOrderItem" ADD CONSTRAINT "PosOrderItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "PosMenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosOrderItemModifier" ADD CONSTRAINT "PosOrderItemModifier_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "PosOrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosOrderItemModifier" ADD CONSTRAINT "PosOrderItemModifier_modifierId_fkey" FOREIGN KEY ("modifierId") REFERENCES "PosModifier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryPurchase" ADD CONSTRAINT "InventoryPurchase_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryStockMovement" ADD CONSTRAINT "InventoryStockMovement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryStockMovement" ADD CONSTRAINT "InventoryStockMovement_referenceOrderId_fkey" FOREIGN KEY ("referenceOrderId") REFERENCES "PosOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosRecipeIngredient" ADD CONSTRAINT "PosRecipeIngredient_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "PosMenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosRecipeIngredient" ADD CONSTRAINT "PosRecipeIngredient_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
