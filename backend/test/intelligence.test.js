import assert from "node:assert/strict";
import test from "node:test";
import { listCustomerRecommendations } from "../src/services/recommendationService.js";
import { getDealHealth } from "../src/services/dealHealthService.js";
import { getDealRescue } from "../src/services/dealRescueService.js";

const product = (id, name, category, basePrice = "100.00") => ({ id, name, sku: id, category, basePrice });

const recommendationPrisma = {
  user: { findUnique: async () => ({ customerId: "customer-1" }) },
  order: { findMany: async () => [{ items: [{ productId: "product-1", product: product("product-1", "Core", "Core") }] }] },
  quotation: { findMany: async () => [{ items: [{ productId: "product-1", product: product("product-1", "Core", "Core") }] }] },
  product: { findMany: async () => [product("product-1", "Core", "Core"), product("product-2", "Extension", "Core"), product("product-3", "Service", "Services")] },
};

test("recommendations use purchase history and hide internal scoring from customers", async () => {
  const data = await listCustomerRecommendations(recommendationPrisma, { id: "customer-user", role: "CUSTOMER" }, "customer-1");
  assert.equal(data[0].type, "UPSELL");
  assert.equal(data[0].product.id, "product-2");
  assert.equal("relevanceScore" in data[0], false);
  await assert.rejects(() => listCustomerRecommendations(recommendationPrisma, { id: "other-user", role: "CUSTOMER" }, "customer-2"), /Insufficient permissions/);
});

const healthQuotation = {
  id: "quotation-1",
  quotationNumber: "Q-1",
  status: "PENDING_APPROVAL",
  discountPercent: "25.00",
  total: "750.00",
  createdAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000),
  updatedAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000),
  approvalRequests: [{ status: "PENDING", approvalRole: "MANAGER", createdAt: new Date() }],
  negotiations: [{ status: "OPEN", updatedAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000) }],
  items: [{ quantity: "1", unitPrice: "1000.00", discountAmount: "250.00", productId: "product-1" }],
};

const healthPrisma = {
  quotation: { findUnique: async () => healthQuotation, findMany: async () => [healthQuotation] },
};

test("deal health classifies discount, inactivity, approval, and stalled negotiation risk", async () => {
  const health = await getDealHealth(healthPrisma, { role: "MANAGER", id: "manager-1" }, "quotation-1");
  assert.equal(health.status, "CRITICAL");
  assert.ok(health.riskScore >= 60);
  assert.ok(health.rootCauses.includes("Excessive discount"));
  assert.ok(health.rootCauses.includes("Approval is pending"));
  assert.ok(health.rootCauses.includes("Negotiation has stalled"));
});

test("deal rescue maps health causes to deterministic playbooks", async () => {
  const rescue = await getDealRescue(healthPrisma, { role: "MANAGER", id: "manager-1" }, "quotation-1");
  assert.ok(rescue.some((item) => item.action.includes("service value")));
  assert.ok(rescue.some((item) => item.action.includes("Escalate")));
  assert.ok(rescue.every((item) => item.priority));
  assert.deepEqual(await getDealRescue(healthPrisma, { role: "CUSTOMER", id: "customer-1" }, "quotation-1"), []);
});
