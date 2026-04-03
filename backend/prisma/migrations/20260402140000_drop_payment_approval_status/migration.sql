-- AlterTable
ALTER TABLE "Order" DROP COLUMN "paymentApprovalStatus";

-- DropEnum
DROP TYPE "PaymentApprovalStatus";
