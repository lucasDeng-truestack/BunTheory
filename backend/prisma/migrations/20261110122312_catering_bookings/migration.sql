/*
  Warnings:

  - You are about to drop the column `adminWhatsappNumber` on the `SystemSettings` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "CateringBookingStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'CANCELLED', 'EXPIRED', 'COMPLETED');

-- AlterTable
ALTER TABLE "SystemSettings" DROP COLUMN "adminWhatsappNumber",
ADD COLUMN     "cateringBookingWindowMonths" INTEGER NOT NULL DEFAULT 6,
ADD COLUMN     "cateringCancelCutoffDays" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "cateringHoldExpiryDays" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "cateringMinNoticeDays" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "cateringNotifyEmail" TEXT;

-- CreateTable
CREATE TABLE "CateringPackage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT NOT NULL,
    "includes" TEXT[],
    "imageUrl" TEXT,
    "minGuests" INTEGER NOT NULL DEFAULT 10,
    "maxGuests" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CateringPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CateringBooking" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "status" "CateringBookingStatus" NOT NULL DEFAULT 'PENDING',
    "eventDate" DATE NOT NULL,
    "serviceTime" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "packageName" TEXT NOT NULL,
    "guests" INTEGER NOT NULL,
    "occasion" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "eventAddress" TEXT NOT NULL,
    "dietaryNotes" TEXT,
    "notes" TEXT,
    "quoteAmount" DECIMAL(10,2),
    "depositAmount" DECIMAL(10,2),
    "depositPaidAt" TIMESTAMP(3),
    "balancePaidAt" TIMESTAMP(3),
    "adminNotes" TEXT,
    "declineReason" TEXT,
    "holdExpiresAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CateringBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CateringDate" (
    "date" DATE NOT NULL,
    "bookingId" TEXT,
    "blockReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CateringDate_pkey" PRIMARY KEY ("date")
);

-- CreateTable
CREATE TABLE "CateringGalleryImage" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "caption" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CateringGalleryImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CateringTestimonial" (
    "id" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CateringTestimonial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CateringBooking_reference_key" ON "CateringBooking"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "CateringBooking_accessToken_key" ON "CateringBooking"("accessToken");

-- CreateIndex
CREATE INDEX "CateringBooking_status_eventDate_idx" ON "CateringBooking"("status", "eventDate");

-- CreateIndex
CREATE INDEX "CateringBooking_createdAt_idx" ON "CateringBooking"("createdAt");

-- CreateIndex
CREATE INDEX "CateringBooking_packageId_idx" ON "CateringBooking"("packageId");

-- CreateIndex
CREATE INDEX "CateringBooking_customerEmail_status_idx" ON "CateringBooking"("customerEmail", "status");

-- CreateIndex
CREATE INDEX "CateringBooking_customerPhone_status_idx" ON "CateringBooking"("customerPhone", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CateringDate_bookingId_key" ON "CateringDate"("bookingId");

-- AddForeignKey
ALTER TABLE "CateringBooking" ADD CONSTRAINT "CateringBooking_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CateringPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CateringDate" ADD CONSTRAINT "CateringDate_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "CateringBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
