-- Catering moves to delivery with a number of sets per day: CateringDate (one booking per
-- date) is replaced by CateringDay (closed / capacity overrides). Blocked dates are kept.
-- CreateEnum
CREATE TYPE "CateringPriceUnit" AS ENUM ('PER_SET', 'PER_PAX');

-- CreateEnum
CREATE TYPE "CateringPaymentChoice" AS ENUM ('DEPOSIT', 'FULL');

-- CreateTable
CREATE TABLE "CateringDay" (
    "date" DATE NOT NULL,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "capacity" INTEGER,
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CateringDay_pkey" PRIMARY KEY ("date")
);

-- DropForeignKey
ALTER TABLE "CateringDate" DROP CONSTRAINT "CateringDate_bookingId_fkey";

-- AlterTable
ALTER TABLE "CateringBooking" ADD COLUMN     "paymentChoice" "CateringPaymentChoice" NOT NULL DEFAULT 'DEPOSIT',
ALTER COLUMN "occasion" DROP NOT NULL;

-- AlterTable
ALTER TABLE "CateringPackage" ADD COLUMN     "price" DECIMAL(10,2),
ADD COLUMN     "priceUnit" "CateringPriceUnit" NOT NULL DEFAULT 'PER_SET';

-- AlterTable
ALTER TABLE "SystemSettings" ADD COLUMN     "cateringBankAccountName" TEXT,
ADD COLUMN     "cateringBankAccountNumber" TEXT,
ADD COLUMN     "cateringBankName" TEXT,
ADD COLUMN     "cateringDailySets" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "cateringPaymentQrUrl" TEXT;

-- Owner-blocked dates (no booking) become closed days. Booking holds are not copied:
-- a day's bookings are now counted from CateringBooking.status.
INSERT INTO "CateringDay" ("date", "closed", "note", "updatedAt")
SELECT "date", true, "blockReason", CURRENT_TIMESTAMP FROM "CateringDate" WHERE "bookingId" IS NULL;

-- DropTable
DROP TABLE "CateringDate";

-- CreateTable
CREATE TABLE "CateringReceipt" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CateringReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CateringReceipt_bookingId_idx" ON "CateringReceipt"("bookingId");

-- AddForeignKey
ALTER TABLE "CateringReceipt" ADD CONSTRAINT "CateringReceipt_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "CateringBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
