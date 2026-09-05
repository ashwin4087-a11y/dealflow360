CREATE TYPE "NegotiationStatus" AS ENUM ('OPEN', 'COUNTEROFFER_REQUESTED', 'COUNTEROFFER_DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ACCEPTED', 'CLOSED');

CREATE TABLE "Negotiation" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "status" "NegotiationStatus" NOT NULL DEFAULT 'OPEN',
    "customerRequestedDiscount" DECIMAL(5,2),
    "customerRequestedQuantity" DECIMAL(12,2),
    "customerRequestedPaymentTerms" TEXT,
    "customerMessage" TEXT,
    "currentDiscount" DECIMAL(5,2) NOT NULL,
    "proposedDiscount" DECIMAL(5,2),
    "proposedQuantity" DECIMAL(12,2),
    "proposedPaymentTerms" TEXT,
    "proposedMessage" TEXT,
    "calculatedSubtotal" DECIMAL(14,2),
    "calculatedTotal" DECIMAL(14,2),
    "calculatedMargin" DECIMAL(14,2),
    "approvalRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Negotiation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NegotiationEvent" (
    "id" TEXT NOT NULL,
    "negotiationId" TEXT NOT NULL,
    "actorId" TEXT,
    "eventType" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NegotiationEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Negotiation_quotationId_idx" ON "Negotiation"("quotationId");
CREATE INDEX "Negotiation_customerId_idx" ON "Negotiation"("customerId");
CREATE INDEX "Negotiation_createdBy_idx" ON "Negotiation"("createdBy");
CREATE INDEX "Negotiation_status_idx" ON "Negotiation"("status");
CREATE INDEX "NegotiationEvent_negotiationId_createdAt_idx" ON "NegotiationEvent"("negotiationId", "createdAt");
CREATE INDEX "NegotiationEvent_actorId_idx" ON "NegotiationEvent"("actorId");

ALTER TABLE "Negotiation" ADD CONSTRAINT "Negotiation_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Negotiation" ADD CONSTRAINT "Negotiation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Negotiation" ADD CONSTRAINT "Negotiation_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NegotiationEvent" ADD CONSTRAINT "NegotiationEvent_negotiationId_fkey" FOREIGN KEY ("negotiationId") REFERENCES "Negotiation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NegotiationEvent" ADD CONSTRAINT "NegotiationEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;