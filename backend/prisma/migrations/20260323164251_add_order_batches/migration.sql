-- CreateEnum
CREATE TYPE "OrderBatchStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_menuId_fkey";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "batchId" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "menuSnapshotItemId" TEXT,
ALTER COLUMN "menuId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "OrderBatch" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "fulfillmentDate" DATE NOT NULL,
    "opensAt" TIMESTAMP(3) NOT NULL,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "maxItems" INTEGER NOT NULL,
    "status" "OrderBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuSnapshot" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuSnapshotItem" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "image" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MenuSnapshotItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MenuSnapshot_batchId_key" ON "MenuSnapshot"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuSnapshotItem_snapshotId_slug_key" ON "MenuSnapshotItem"("snapshotId", "slug");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "OrderBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_menuSnapshotItemId_fkey" FOREIGN KEY ("menuSnapshotItemId") REFERENCES "MenuSnapshotItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuSnapshot" ADD CONSTRAINT "MenuSnapshot_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "OrderBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuSnapshotItem" ADD CONSTRAINT "MenuSnapshotItem_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "MenuSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
