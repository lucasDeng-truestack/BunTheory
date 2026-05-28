-- Drop eat-in / takeaway service type from Weekend Grills POS orders
ALTER TABLE "PosOrder" DROP COLUMN "serviceType";

DROP TYPE "PosServiceType";
