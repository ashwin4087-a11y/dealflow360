CREATE TABLE "Allocation" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "allocatedQuantity" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Allocation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Allocation_allocatedQuantity_positive" CHECK ("allocatedQuantity" > 0)
);

CREATE UNIQUE INDEX "Allocation_orderItemId_warehouseId_key"
  ON "Allocation"("orderItemId", "warehouseId");
CREATE INDEX "Allocation_warehouseId_idx" ON "Allocation"("warehouseId");

ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_orderItemId_fkey"
  FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_warehouseId_fkey"
  FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;