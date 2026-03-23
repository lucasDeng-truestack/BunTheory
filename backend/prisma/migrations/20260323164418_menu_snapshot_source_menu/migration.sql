-- AlterTable
ALTER TABLE "MenuSnapshotItem" ADD COLUMN     "sourceMenuId" TEXT;

-- AddForeignKey
ALTER TABLE "MenuSnapshotItem" ADD CONSTRAINT "MenuSnapshotItem_sourceMenuId_fkey" FOREIGN KEY ("sourceMenuId") REFERENCES "Menu"("id") ON DELETE SET NULL ON UPDATE CASCADE;
