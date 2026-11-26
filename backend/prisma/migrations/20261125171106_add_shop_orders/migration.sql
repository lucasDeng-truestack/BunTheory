-- CreateEnum
CREATE TYPE "ShopFulfilmentType" AS ENUM ('PICKUP', 'DELIVERY');

-- CreateEnum
CREATE TYPE "ShopPaymentChoice" AS ENUM ('DEPOSIT', 'FULL');

-- CreateEnum
CREATE TYPE "ShopOrderStatus" AS ENUM ('AWAITING_PAYMENT', 'DEPOSIT_PAID', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "ShopOrder" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "status" "ShopOrderStatus" NOT NULL DEFAULT 'AWAITING_PAYMENT',
    "type" "ShopFulfilmentType" NOT NULL,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postcode" TEXT,
    "deliveryNotes" TEXT,
    "fulfilmentDate" DATE NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "paymentChoice" "ShopPaymentChoice" NOT NULL DEFAULT 'DEPOSIT',
    "amountDue" DECIMAL(10,2) NOT NULL,
    "depositPaidAt" TIMESTAMP(3),
    "fullyPaidAt" TIMESTAMP(3),
    "adminNotes" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "packageKey" TEXT NOT NULL,
    "packageName" TEXT NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "ShopOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopReceipt" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopOrder_reference_key" ON "ShopOrder"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "ShopOrder_accessToken_key" ON "ShopOrder"("accessToken");

-- CreateIndex
CREATE UNIQUE INDEX "ShopOrder_idempotencyKey_key" ON "ShopOrder"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ShopOrder_status_createdAt_idx" ON "ShopOrder"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ShopOrder_fulfilmentDate_idx" ON "ShopOrder"("fulfilmentDate");

-- CreateIndex
CREATE INDEX "ShopOrder_customerPhone_idx" ON "ShopOrder"("customerPhone");

-- CreateIndex
CREATE INDEX "ShopOrderItem_orderId_idx" ON "ShopOrderItem"("orderId");

-- CreateIndex
CREATE INDEX "ShopReceipt_orderId_idx" ON "ShopReceipt"("orderId");

-- AddForeignKey
ALTER TABLE "ShopOrderItem" ADD CONSTRAINT "ShopOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ShopOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopReceipt" ADD CONSTRAINT "ShopReceipt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ShopOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
