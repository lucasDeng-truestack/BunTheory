-- Option slots for à la carte (SIMPLE) menu items
CREATE TABLE "PosProductOptionSlot" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosProductOptionSlot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PosProductOptionSlotOption" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "priceDelta" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosProductOptionSlotOption_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PosProductOptionSlot_productId_sortOrder_idx" ON "PosProductOptionSlot"("productId", "sortOrder");

CREATE INDEX "PosProductOptionSlotOption_slotId_sortOrder_idx" ON "PosProductOptionSlotOption"("slotId", "sortOrder");

ALTER TABLE "PosProductOptionSlot" ADD CONSTRAINT "PosProductOptionSlot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "PosProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PosProductOptionSlotOption" ADD CONSTRAINT "PosProductOptionSlotOption_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "PosProductOptionSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
