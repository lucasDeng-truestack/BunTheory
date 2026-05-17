-- CreateEnum
CREATE TYPE "PosMenuItemKind" AS ENUM ('MAIN_MEAL', 'SIDE', 'DRINK_ADDON');

-- AlterTable
ALTER TABLE "PosMenuItem" ADD COLUMN     "kind" "PosMenuItemKind" NOT NULL DEFAULT 'MAIN_MEAL',
ADD COLUMN     "section" TEXT;
