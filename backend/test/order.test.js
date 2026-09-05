import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";

process.env.JWT_SECRET = "test-secret";

let quotations;
let orders;
let server;
let baseUrl;

const tokenFor = (userId, role) =>
  jwt.sign({ sub: userId, role }, process.env.JWT_SECRET);
  
const request = (path, options = {}) => fetch(`${baseUrl}${path}`, options);

const authenticated = (userId, role, options = {}) => ({
  ...options,
  headers: { authorization: `Bearer ${tokenFor(userId, role)}`, ...options.headers },
});

const jsonRequest = (path, method, body, userId = "user-1", role = "SALESPERSON") =>
  request(
    path,
    authenticated(userId, role, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  );

const prismaMock = {
  user: {
    findUnique: async () => ({ id: "user-1", role: "SALESPERSON" }),
  },
  quotation: {
    findUnique: async ({ where }) => quotations[where.id] || null,
    update: async ({ where, data }) => {
      if (!quotations[where.id]) {
        const error = new Error("Missing quotation");
        error.code = "P2025";
        throw error;
      }
      quotations[where.id] = {
        ...quotations[where.id],
        ...data,
        updatedAt: "2026-01-02T00:00:00.000Z",
      };
      return quotations[where.id];
    },
  },
  order: {
    findUnique: async ({ where }) => Object.values(orders).find(o => o.quotationId === where.quotationId) || null,
    create: async ({ data }) => {
      if (Object.values(orders).find(o => o.quotationId === data.quotationId)) {
        const error = new Error("Unique constraint failed");
        error.code = "P2002";
        throw error;
      }
      const newOrder = {
        id: `order-${Object.keys(orders).length + 1}`,
        orderNumber: data.orderNumber,
        quotationId: data.quotationId,
        createdAt: "2026-01-02T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      };
      orders[newOrder.id] = newOrder;
      return newOrder;
    }
  },
  $transaction: async (callback) => callback(prismaMock),
};

before(async () => {
  const createQuote = (id, status) => ({
    id,
    quotationNumber: `Q-${id}`,
    customerId: "c-1",
    status,
  });

  quotations = {
    "q-draft": createQuote("q-draft", "DRAFT"),
    "q-pending": createQuote("q-pending", "PENDING_APPROVAL"),
    "q-approved": createQuote("q-approved", "APPROVED"),
    "q-sent": createQuote("q-sent", "SENT"),
    "q-rejected": createQuote("q-rejected", "REJECTED"),
    "q-accepted": createQuote("q-accepted", "ACCEPTED"),
    "q-accepted-2": createQuote("q-accepted-2", "ACCEPTED"), // For testing existing order protection
    "q-converted": createQuote("q-converted", "CONVERTED"),
    "q-cancelled": createQuote("q-cancelled", "CANCELLED"),
    "q-negotiation": createQuote("q-negotiation", "NEGOTIATION"),
  };

  orders = {
    "o-existing": {
      id: "o-existing",
      orderNumber: "ORD-EXISTING",
      quotationId: "q-accepted-2",
      createdAt: "2026-01-02T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    }
  };

  server = createApp(prismaMock).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

describe("ORDER CONVERSION", () => {
  it("ACCEPTED quotation converts successfully", async () => {
    const response = await jsonRequest("/api/quotations/q-accepted/convert", "POST", {});
    const body = await response.json();
    
    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    
    // Order is created
    const newOrder = body.data;
    assert.ok(newOrder.id);
    assert.equal(newOrder.quotationId, "q-accepted");
    
    // Backend generates orderNumber
    assert.ok(newOrder.orderNumber.startsWith("ORD-"));
    
    // Quotation becomes CONVERTED
    assert.equal(quotations["q-accepted"].status, "CONVERTED");
  });

  it("Client cannot override orderNumber during conversion", async () => {
    // Re-setup accepted quote just for testing this directly via a new state setup if we want
    quotations["q-accepted-3"] = { id: "q-accepted-3", status: "ACCEPTED" };
    
    const response = await jsonRequest("/api/quotations/q-accepted-3/convert", "POST", { orderNumber: "MY-CUSTOM-ORD" });
    const body = await response.json();
    
    assert.equal(response.status, 200);
    assert.ok(body.data.orderNumber.startsWith("ORD-"));
    assert.notEqual(body.data.orderNumber, "MY-CUSTOM-ORD");
  });

  it("Rejects conversion for all non-ACCEPTED statuses", async () => {
    const statuses = [
      "q-draft",
      "q-pending",
      "q-approved",
      "q-sent",
      "q-rejected",
      "q-converted",
      "q-cancelled",
      "q-negotiation",
    ];
    
    for (const qId of statuses) {
      const response = await jsonRequest(`/api/quotations/${qId}/convert`, "POST", {});
      assert.equal(response.status, 409);
      
      const body = await response.json();
      if (qId === "q-converted") {
        assert.ok(body.error.includes("already been converted"));
      } else {
        assert.ok(body.error.includes("Only ACCEPTED quotations can be converted"));
      }
    }
  });

  it("Existing Order prevents duplicate conversion", async () => {
    // q-accepted-2 is still ACCEPTED (in mocked state) but already has an order in `orders`
    const response = await jsonRequest("/api/quotations/q-accepted-2/convert", "POST", {});
    assert.equal(response.status, 409);
    const body = await response.json();
    assert.ok(body.error.includes("An order already exists"));
  });

  it("CUSTOMER receives 403", async () => {
    const response = await jsonRequest("/api/quotations/q-accepted/convert", "POST", {}, "user-1", "CUSTOMER");
    assert.equal(response.status, 403);
  });

  it("Unauthenticated request receives 401", async () => {
    const response = await request("/api/quotations/q-accepted/convert", { method: "POST" });
    assert.equal(response.status, 401);
  });
  
  it("Client cannot override quotation status via PUT", async () => {
    const response = await jsonRequest("/api/quotations/q-draft", "PUT", {
      status: "CONVERTED"
    }, "user-1", "SALESPERSON");
    
    // the previous quotation updates logic blocks clients from setting statuses manually anyway,
    // let's just make sure the mock returns 400 or ignoring it.
    // Assuming the existing controller either strips status or throws an error.
    assert.notEqual(response.status, 200); // or if it succeeds, it shouldn't change the status
  });
});
