CREATE TYPE "FulfillmentStatus" AS ENUM ('PENDING', 'ALLOCATED', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED');

CREATE TABLE "Fulfillment" (
    "id" TEXT NOT NULL,
    "allocationId" TEXT NOT NULL,
    "fulfilledQuantity" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "FulfillmentStatus" NOT NULL DEFAULT 'ALLOCATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fulfillment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Fulfillment_fulfilledQuantity_nonnegative" CHECK ("fulfilledQuantity" >= 0)
);

CREATE UNIQUE INDEX "Fulfillment_allocationId_key" ON "Fulfillment"("allocationId");

ALTER TABLE "Fulfillment" ADD CONSTRAINT "Fulfillment_allocationId_fkey"
  FOREIGN KEY ("allocationId") REFERENCES "Allocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;