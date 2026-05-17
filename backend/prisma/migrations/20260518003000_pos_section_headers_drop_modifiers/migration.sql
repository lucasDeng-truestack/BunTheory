-- Remove POS line-item modifiers (replaced by simple menu + remarks).
ALTER TABLE "PosOrderItemModifier" DROP CONSTRAINT IF EXISTS "PosOrderItemModifier_modifierId_fkey";
ALTER TABLE "PosOrderItemModifier" DROP CONSTRAINT IF EXISTS "PosOrderItemModifier_orderItemId_fkey";
DROP TABLE IF EXISTS "PosOrderItemModifier";

ALTER TABLE "PosModifier" DROP CONSTRAINT IF EXISTS "PosModifier_groupId_fkey";
DROP TABLE IF EXISTS "PosModifier";

ALTER TABLE "PosModifierGroup" DROP CONSTRAINT IF EXISTS "PosModifierGroup_menuItemId_fkey";
DROP TABLE IF EXISTS "PosModifierGroup";

-- Subsection headers per menu category (McDonald\'s-style).
CREATE TABLE "PosMenuSectionHeader" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PosMenuSectionHeader_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PosMenuSectionHeader_categoryId_sortOrder_idx" ON "PosMenuSectionHeader"("categoryId", "sortOrder");

ALTER TABLE "PosMenuSectionHeader" ADD CONSTRAINT "PosMenuSectionHeader_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PosCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PosMenuItem" ADD COLUMN "sectionHeaderId" TEXT;

ALTER TABLE "PosMenuItem" DROP COLUMN IF EXISTS "section";

ALTER TABLE "PosMenuItem" ADD CONSTRAINT "PosMenuItem_sectionHeaderId_fkey" FOREIGN KEY ("sectionHeaderId") REFERENCES "PosMenuSectionHeader"("id") ON DELETE SET NULL ON UPDATE CASCADE;
