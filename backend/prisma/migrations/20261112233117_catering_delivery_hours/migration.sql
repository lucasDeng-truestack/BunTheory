-- AlterTable
ALTER TABLE "CateringDay" ADD COLUMN     "deliveryEnd" TEXT,
ADD COLUMN     "deliveryStart" TEXT;

-- AlterTable
ALTER TABLE "SystemSettings" ADD COLUMN     "cateringDeliveryEnd" TEXT NOT NULL DEFAULT '21:00',
ADD COLUMN     "cateringDeliveryStart" TEXT NOT NULL DEFAULT '10:00';
