-- AlterTable
ALTER TABLE "PosOrder" ADD COLUMN     "inventoryDeductedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PosInventoryItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "isCountable" BOOLEAN NOT NULL DEFAULT true,
    "quantityOnHand" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lowStockThreshold" DECIMAL(10,2),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosInventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosProductIngredient" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantityPerUnit" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "PosProductIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosInventoryMovement" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "orderId" TEXT,
    "delta" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PosInventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PosInventoryItem_name_key" ON "PosInventoryItem"("name");

-- CreateIndex
CREATE INDEX "PosInventoryItem_sortOrder_idx" ON "PosInventoryItem"("sortOrder");

-- CreateIndex
CREATE INDEX "PosProductIngredient_inventoryItemId_idx" ON "PosProductIngredient"("inventoryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "PosProductIngredient_productId_inventoryItemId_key" ON "PosProductIngredient"("productId", "inventoryItemId");

-- CreateIndex
CREATE INDEX "PosInventoryMovement_orderId_idx" ON "PosInventoryMovement"("orderId");

-- CreateIndex
CREATE INDEX "PosInventoryMovement_inventoryItemId_createdAt_idx" ON "PosInventoryMovement"("inventoryItemId", "createdAt");

-- AddForeignKey
ALTER TABLE "PosProductIngredient" ADD CONSTRAINT "PosProductIngredient_productId_fkey" FOREIGN KEY ("productId") REFERENCES "PosProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosProductIngredient" ADD CONSTRAINT "PosProductIngredient_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "PosInventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosInventoryMovement" ADD CONSTRAINT "PosInventoryMovement_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "PosInventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosInventoryMovement" ADD CONSTRAINT "PosInventoryMovement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PosOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
