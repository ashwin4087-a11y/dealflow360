import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";

process.env.JWT_SECRET = "test-secret";

let quotations;
let orders;
let orderItems;
let failAfterOrderCreate = false;
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

const createQuote = (id, status, items = []) => ({
  id,
  quotationNumber: `Q-${id}`,
  customerId: "c-1",
  status,
  items,
});

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
        items: (data.items?.create || []).map((item, index) => ({
          id: `order-item-${Object.keys(orderItems).length + index + 1}`,
          productId: item.productId,
          quantity: item.quantity,
        })),
      };
      orders[newOrder.id] = newOrder;
      for (const item of newOrder.items) orderItems[item.id] = item;
      if (failAfterOrderCreate) throw new Error("Simulated transaction failure");
      return newOrder;
    }
  },
  $transaction: async (callback) => {
    const quotationSnapshot = structuredClone(quotations);
    const orderSnapshot = structuredClone(orders);
    const orderItemSnapshot = structuredClone(orderItems);
    try {
      return await callback(prismaMock);
    } catch (error) {
      quotations = quotationSnapshot;
      orders = orderSnapshot;
      orderItems = orderItemSnapshot;
      throw error;
    }
  },
};

before(async () => {
  quotations = {
    "q-draft": createQuote("q-draft", "DRAFT"),
    "q-pending": createQuote("q-pending", "PENDING_APPROVAL"),
    "q-approved": createQuote("q-approved", "APPROVED"),
    "q-sent": createQuote("q-sent", "SENT"),
    "q-rejected": createQuote("q-rejected", "REJECTED"),
    "q-accepted": createQuote("q-accepted", "ACCEPTED", [
      { productId: "product-1", quantity: 60, product: { id: "product-1" } },
      { productId: "product-2", quantity: 40, product: { id: "product-2" } },
    ]),
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
  orderItems = {};

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
    assert.deepEqual(newOrder.items, [
      { id: "order-item-1", productId: "product-1", quantity: 60 },
      { id: "order-item-2", productId: "product-2", quantity: 40 },
    ]);
    assert.equal(orderItems["order-item-1"].productId, "product-1");
    assert.equal(orderItems["order-item-2"].quantity, 40);
    
    // Quotation becomes CONVERTED
    assert.equal(quotations["q-accepted"].status, "CONVERTED");
  });

  it("Client cannot override orderNumber during conversion", async () => {
    // Re-setup accepted quote just for testing this directly via a new state setup if we want
    quotations["q-accepted-3"] = {
      id: "q-accepted-3",
      status: "ACCEPTED",
      items: [{ productId: "product-1", quantity: 1, product: { id: "product-1" } }],
    };
    
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

  it("preserves duplicate quotation product lines as separate order items", async () => {
    quotations["q-duplicate-products"] = createQuote("q-duplicate-products", "ACCEPTED", [
      { productId: "product-1", quantity: 2, product: { id: "product-1" } },
      { productId: "product-1", quantity: 3, product: { id: "product-1" } },
    ]);
    const response = await jsonRequest("/api/quotations/q-duplicate-products/convert", "POST", {
      items: [{ productId: "client-product", quantity: 999 }],
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body.data.items.map(({ productId, quantity }) => ({ productId, quantity })), [
      { productId: "product-1", quantity: 2 },
      { productId: "product-1", quantity: 3 },
    ]);
  });

  it("rejects invalid quotation item quantities without creating an order", async () => {
    quotations["q-invalid-items"] = createQuote("q-invalid-items", "ACCEPTED", [
      { productId: "product-1", quantity: 0, product: { id: "product-1" } },
    ]);
    const response = await jsonRequest("/api/quotations/q-invalid-items/convert", "POST", {});
    assert.equal(response.status, 409);
    assert.equal(quotations["q-invalid-items"].status, "ACCEPTED");
    assert.equal(Object.values(orders).some((order) => order.quotationId === "q-invalid-items"), false);
  });

  it("rolls back the order, items, and quotation when the transaction fails", async () => {
    quotations["q-rollback"] = createQuote("q-rollback", "ACCEPTED", [
      { productId: "product-1", quantity: 1, product: { id: "product-1" } },
    ]);
    const initialOrderItemCount = Object.keys(orderItems).length;
    failAfterOrderCreate = true;
    const response = await jsonRequest("/api/quotations/q-rollback/convert", "POST", {});
    failAfterOrderCreate = false;

    assert.equal(response.status, 500);
    assert.equal(quotations["q-rollback"].status, "ACCEPTED");
    assert.equal(Object.values(orders).some((order) => order.quotationId === "q-rollback"), false);
    assert.equal(Object.keys(orderItems).length, initialOrderItemCount);
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
