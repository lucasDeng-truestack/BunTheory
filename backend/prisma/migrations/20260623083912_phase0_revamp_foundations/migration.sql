-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('OWNER', 'MANAGER', 'KITCHEN', 'CASHIER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'OUT_FOR_DELIVERY';
ALTER TYPE "OrderStatus" ADD VALUE 'PICKED_UP';
ALTER TYPE "OrderStatus" ADD VALUE 'COMPLETED';
ALTER TYPE "OrderStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "role" "AdminRole" NOT NULL DEFAULT 'OWNER';

-- AlterTable
ALTER TABLE "Menu" ADD COLUMN     "category" TEXT,
ADD COLUMN     "soldOut" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "deliveryFee" DECIMAL(10,2),
ADD COLUMN     "processingFee" DECIMAL(10,2),
ADD COLUMN     "restaurantComment" TEXT,
ADD COLUMN     "subtotal" DECIMAL(10,2),
ADD COLUMN     "taxAmount" DECIMAL(10,2),
ADD COLUMN     "total" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "SystemSettings" ADD COLUMN     "deliveryFee" DECIMAL(10,2),
ADD COLUMN     "deliveryRadiusNote" TEXT,
ADD COLUMN     "outletAddress" TEXT,
ADD COLUMN     "outletHours" JSONB,
ADD COLUMN     "outletName" TEXT,
ADD COLUMN     "prepTimeMinutes" INTEGER,
ADD COLUMN     "processingFee" DECIMAL(10,2),
ADD COLUMN     "taxRatePercent" DECIMAL(5,2) NOT NULL DEFAULT 6;
