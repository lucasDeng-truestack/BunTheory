-- CreateEnum
CREATE TYPE "PaymentChoice" AS ENUM ('PAY_LATER', 'PAY_NOW');

-- CreateEnum
CREATE TYPE "PaymentApprovalStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "paymentChoice" "PaymentChoice" NOT NULL DEFAULT 'PAY_LATER';
ALTER TABLE "Order" ADD COLUMN "paymentReceiptUrl" TEXT;
ALTER TABLE "Order" ADD COLUMN "paymentApprovalStatus" "PaymentApprovalStatus" NOT NULL DEFAULT 'NONE';
