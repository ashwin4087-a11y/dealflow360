CREATE TYPE "BackorderStatus" AS ENUM ('BACKORDERED', 'READY_TO_FULFILL', 'FULFILLED', 'CANCELLED');

CREATE TABLE "Backorder" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "requiredQuantity" DECIMAL(12,2) NOT NULL,
    "fulfilledQuantity" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "remainingQuantity" DECIMAL(12,2) NOT NULL,
    "status" "BackorderStatus" NOT NULL DEFAULT 'BACKORDERED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Backorder_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Backorder_requiredQuantity_positive" CHECK ("requiredQuantity" > 0),
    CONSTRAINT "Backorder_fulfilledQuantity_nonnegative" CHECK ("fulfilledQuantity" >= 0),
    CONSTRAINT "Backorder_remainingQuantity_nonnegative" CHECK ("remainingQuantity" >= 0)
);

CREATE INDEX "Backorder_orderId_idx" ON "Backorder"("orderId");
CREATE INDEX "Backorder_orderItemId_idx" ON "Backorder"("orderItemId");
CREATE INDEX "Backorder_productId_status_idx" ON "Backorder"("productId", "status");

ALTER TABLE "Backorder" ADD CONSTRAINT "Backorder_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Backorder" ADD CONSTRAINT "Backorder_orderItemId_fkey"
  FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Backorder" ADD CONSTRAINT "Backorder_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;