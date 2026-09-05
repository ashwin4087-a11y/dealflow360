import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  approveCounteroffer,
  closeNegotiation,
  createCounteroffer,
  createNegotiation,
  getNegotiation,
  rejectCounteroffer,
  submitCounteroffer,
} from "../src/services/negotiationService.js";

const customer = { id: "customer-1", name: "ABC Corporation", company: "ABC Corporation" };
const salesperson = { id: "sales-1", name: "Salesperson", role: "SALESPERSON" };
const quotation = {
  id: "quote-1",
  quotationNumber: "Q-1",
  customerId: customer.id,
  salespersonId: salesperson.id,
  status: "SENT",
  subtotal: "1000.00",
  discountPercent: "0.00",
  total: "1000.00",
  taxPercent: "0.00",
  marginAmount: "400.00",
  customer,
  salesperson,
  items: [{ productId: "product-1", quantity: "1", unitPrice: "1000.00", discountPercent: "0.00", discountAmount: "0.00", lineTotal: "1000.00", product: { id: "product-1", name: "Platform", category: "Software" } }],
};

const makePrisma = () => {
  const negotiations = {};
  const events = [];
  let nextId = 1;
  const users = {
    "customer-user": { id: "customer-user", customerId: customer.id },
    "other-customer-user": { id: "other-customer-user", customerId: "customer-2" },
  };

  const negotiationView = (negotiation) => ({
    ...negotiation,
    quotation,
    customer,
    creator: salesperson,
    events: events.filter((event) => event.negotiationId === negotiation.id),
  });

  const prisma = {
    user: { findUnique: async ({ where }) => users[where.id] || null },
    customer: { findUnique: async ({ where }) => where.id === customer.id ? { ...customer, customerTier: "GOLD" } : null },
    product: { findUnique: async ({ where }) => where.id === "product-1" ? { id: "product-1", name: "Platform", category: "Software", basePrice: "1000.00", active: true } : null },
    discountRule: { findFirst: async () => ({ maxDiscountPercent: "100.00" }) },
    approvalRule: { findMany: async () => [{ minBlendedDiscountPercent: "10.00", requiresManager: true, requiresFinance: false }] },
    quotation: {
      findUnique: async ({ where }) => where.id === quotation.id ? quotation : null,
      update: async ({ where, data }) => Object.assign(quotation, data),
    },
    negotiation: {
      findFirst: async ({ where }) => {
        const values = Object.values(negotiations).filter((item) => item.quotationId === where.quotationId);
        return values.find((item) => item.status !== "CLOSED") || values.at(-1) || null;
      },
      findMany: async () => Object.values(negotiations).map(negotiationView),
      findUnique: async ({ where }) => negotiations[where.id] ? negotiationView(negotiations[where.id]) : null,
      create: async ({ data }) => {
        const created = { status: "OPEN", approvalRequired: false, ...data, id: `negotiation-${nextId++}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        negotiations[created.id] = created;
        return created;
      },
      update: async ({ where, data }) => {
        Object.assign(negotiations[where.id], data, { updatedAt: new Date().toISOString() });
        return negotiations[where.id];
      },
    },
    negotiationEvent: {
      create: async ({ data }) => {
        const event = { ...data, id: `event-${events.length + 1}`, createdAt: new Date().toISOString() };
        events.push(event);
        return event;
      },
    },
    $transaction: async (callback) => callback(prisma),
  };
  return { prisma, negotiations, events };
};

describe("negotiation workflow", () => {
  it("creates a negotiation and records history", async () => {
    const { prisma, events } = makePrisma();
    const result = await createNegotiation(prisma, salesperson, quotation.id);
    assert.equal(result.status, "OPEN");
    assert.equal(events[0].eventType, "NEGOTIATION_CREATED");
  });

  it("supports customer and sales counteroffers with calculated impact", async () => {
    const { prisma } = makePrisma();
    const created = await createNegotiation(prisma, salesperson, quotation.id);
    const customerResult = await createCounteroffer(prisma, { id: "customer-user", role: "CUSTOMER" }, created.id, {
      customerRequestedDiscount: "12",
      customerRequestedQuantity: "2",
      customerRequestedPaymentTerms: "Net 60",
      customerMessage: "Please improve the commercial terms",
    });
    assert.equal(customerResult.status, "COUNTEROFFER_REQUESTED");
    assert.equal(customerResult.calculatedTotal, "1760.00");
    assert.equal("calculatedMargin" in customerResult, false);
    const salesResult = await createCounteroffer(prisma, salesperson, created.id, {
      proposedDiscount: "15",
      proposedQuantity: "2",
      proposedPaymentTerms: "Net 45",
      proposedMessage: "Final commercial proposal",
    });
    assert.equal(salesResult.status, "COUNTEROFFER_DRAFT");
    assert.equal(salesResult.approvalRequired, true);
  });

  it("requires approval, supports manager approval, and closes on customer acceptance", async () => {
    const { prisma } = makePrisma();
    const created = await createNegotiation(prisma, salesperson, quotation.id);
    await createCounteroffer(prisma, salesperson, created.id, { proposedDiscount: "15", proposedQuantity: "1" });
    const submitted = await submitCounteroffer(prisma, salesperson, created.id);
    assert.equal(submitted.status, "PENDING_APPROVAL");
    const approved = await approveCounteroffer(prisma, { id: "manager-1", role: "MANAGER" }, created.id);
    assert.equal(approved.status, "APPROVED");
    const closed = await closeNegotiation(prisma, { id: "customer-user", role: "CUSTOMER" }, created.id);
    assert.equal(closed.status, "CLOSED");
    assert.equal(quotation.status, "ACCEPTED");
  });

  it("rejects unauthorized customer access and manager rejection", async () => {
    const { prisma } = makePrisma();
    const created = await createNegotiation(prisma, salesperson, quotation.id);
    await assert.rejects(() => getNegotiation(prisma, { id: "other-customer-user", role: "CUSTOMER" }, created.id), (error) => error.statusCode === 404);
    await createCounteroffer(prisma, salesperson, created.id, { proposedDiscount: "15", proposedQuantity: "1" });
    await submitCounteroffer(prisma, salesperson, created.id);
    const rejected = await rejectCounteroffer(prisma, { id: "manager-1", role: "MANAGER" }, created.id);
    assert.equal(rejected.status, "REJECTED");
  });
});
