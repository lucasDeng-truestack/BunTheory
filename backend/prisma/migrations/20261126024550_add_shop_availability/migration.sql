-- AlterTable
ALTER TABLE "SystemSettings" ADD COLUMN     "shopEarliestDate" TEXT NOT NULL DEFAULT '2026-12-14',
ADD COLUMN     "shopMinNoticeDays" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "shopOrdersOpenDate" TEXT,
ADD COLUMN     "shopServeEnd" TEXT NOT NULL DEFAULT '20:00',
ADD COLUMN     "shopServeStart" TEXT NOT NULL DEFAULT '12:00',
ADD COLUMN     "shopWindowDays" INTEGER NOT NULL DEFAULT 60;

-- CreateTable
CREATE TABLE "ShopDay" (
    "date" DATE NOT NULL,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "serveStart" TEXT,
    "serveEnd" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopDay_pkey" PRIMARY KEY ("date")
);
