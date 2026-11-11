-- AlterTable
ALTER TABLE "SystemSettings" ALTER COLUMN "cateringCancelCutoffDays" SET DEFAULT 3;

-- Owner decision: default cancellation cutoff is 3 days. Move rows still on the old default.
UPDATE "SystemSettings" SET "cateringCancelCutoffDays" = 3 WHERE "cateringCancelCutoffDays" = 7;
