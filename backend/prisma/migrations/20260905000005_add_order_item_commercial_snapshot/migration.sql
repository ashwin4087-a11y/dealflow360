ALTER TABLE "OrderItem"
  ADD COLUMN "quotationItemId" TEXT,
  ADD COLUMN "unitPrice" DECIMAL(14,2),
  ADD COLUMN "lineTotal" DECIMAL(14,2);

ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_quotationItemId_fkey"
  FOREIGN KEY ("quotationItemId") REFERENCES "QuotationItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "OrderItem_quotationItemId_key" ON "OrderItem"("quotationItemId");

ALTER TABLE "OrderItem"
  ALTER COLUMN "quotationItemId" SET NOT NULL,
  ALTER COLUMN "unitPrice" SET NOT NULL,
  ALTER COLUMN "lineTotal" SET NOT NULL;