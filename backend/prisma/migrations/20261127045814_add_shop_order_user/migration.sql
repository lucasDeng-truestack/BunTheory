-- AlterTable
ALTER TABLE "ShopOrder" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE INDEX "ShopOrder_userId_idx" ON "ShopOrder"("userId");

-- AddForeignKey
ALTER TABLE "ShopOrder" ADD CONSTRAINT "ShopOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
