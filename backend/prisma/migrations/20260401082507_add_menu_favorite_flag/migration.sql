-- Idempotent: some environments applied this under a different migration name.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Menu' AND column_name = 'isFavorite'
  ) THEN
    ALTER TABLE "Menu" ADD COLUMN "isFavorite" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'MenuSnapshotItem')
     AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'MenuSnapshotItem' AND column_name = 'isFavorite'
  ) THEN
    ALTER TABLE "MenuSnapshotItem" ADD COLUMN "isFavorite" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;
