import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";

process.env.JWT_SECRET = "test-secret";

let quotations;
let users;
let server;
let baseUrl;

const customerId1 = "customer-1";
const customerId2 = "customer-2";

const tokenFor = (userId, role = "CUSTOMER") =>
  jwt.sign({ sub: userId, role }, process.env.JWT_SECRET);
  
const request = (path, options = {}) => fetch(`${baseUrl}${path}`, options);

const authenticated = (userId, role = "CUSTOMER", options = {}) => ({
  ...options,
  headers: { authorization: `Bearer ${tokenFor(userId, role)}`, ...options.headers },
});

const jsonRequest = (path, method, body, userId = "user-1", role = "CUSTOMER") =>
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
    findUnique: async ({ where }) => users[where.id] || null,
  },
  quotation: {
    findMany: async ({ where }) =>
      Object.values(quotations).filter(q => q.customerId === where.customerId),
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
  $transaction: async (callback) => callback(prismaMock),
};

before(async () => {
  users = {
    "user-1": { id: "user-1", role: "CUSTOMER", customerId: customerId1 },
    "user-2": { id: "user-2", role: "CUSTOMER", customerId: customerId2 },
    "user-3": { id: "user-3", role: "CUSTOMER", customerId: null }, // No link
    "sales-1": { id: "sales-1", role: "SALESPERSON", customerId: null },
  };

  const createQuote = (id, customerId, status) => ({
    id,
    quotationNumber: `Q-${id}`,
    customerId,
    status,
    subtotal: "100.00",
    discountPercent: "0",
    discountAmount: "0.00",
    taxPercent: "10",
    taxAmount: "10.00",
    total: "110.00",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    customer: { id: customerId, name: `Customer ${customerId}` },
    items: [],
  });

  quotations = {
    "q-1": createQuote("q-1", customerId1, "SENT"),
    "q-2": createQuote("q-2", customerId1, "DRAFT"),
    "q-3": createQuote("q-3", customerId1, "ACCEPTED"),
    "q-4": createQuote("q-4", customerId2, "SENT"),
    "q-5": createQuote("q-5", customerId1, "REJECTED"),
  };

  server = createApp(prismaMock).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

describe("CUSTOMER IDENTITY", () => {
  it("CUSTOMER user linked to Customer can access own quotations", async () => {
    const response = await request("/api/customer/quotations", authenticated("user-1"));
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.every(q => q.customer.id === customerId1), true);
    assert.equal(body.data.length, 4); // q-1, q-2, q-3, q-5
  });

  it("CUSTOMER user without customerId is rejected safely", async () => {
    const response = await request("/api/customer/quotations", authenticated("user-3"));
    assert.equal(response.status, 403);
  });
});

describe("ACCESS and OWNERSHIP", () => {
  it("CUSTOMER can retrieve own quotation", async () => {
    const response = await request("/api/customer/quotations/q-1", authenticated("user-1"));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).data.id, "q-1");
  });

  it("CUSTOMER cannot retrieve another customer's quotation", async () => {
    const response = await request("/api/customer/quotations/q-4", authenticated("user-1"));
    assert.equal(response.status, 404);
  });

  it("CUSTOMER cannot access internal quotation-management APIs as an internal user", async () => {
    const response = await request("/api/quotations/q-1", authenticated("user-1"));
    assert.equal(response.status, 403);
  });
});

describe("ACCEPT Workflow", () => {
  it("correct customer can accept SENT quotation", async () => {
    const response = await jsonRequest("/api/customer/quotations/q-1/accept", "POST", {}, "user-1");
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.data.status, "ACCEPTED");
    assert.equal(quotations["q-1"].status, "ACCEPTED");
  });

  it("cannot accept DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, ACCEPTED, CONVERTED, CANCELLED", async () => {
    const statuses = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "ACCEPTED", "CONVERTED", "CANCELLED"];
    for (const status of statuses) {
      quotations["q-2"].status = status;
      const response = await jsonRequest("/api/customer/quotations/q-2/accept", "POST", {}, "user-1");
      assert.equal(response.status, 409);
    }
  });

  it("Customer A cannot accept Customer B quotation", async () => {
    const response = await jsonRequest("/api/customer/quotations/q-4/accept", "POST", {}, "user-1");
    assert.equal(response.status, 404);
  });
});

describe("REJECT Workflow", () => {
  before(() => {
    quotations["q-6"] = { ...quotations["q-1"], id: "q-6", status: "SENT", customerId: customerId1, customer: { id: customerId1, name: "Customer" } };
  });

  it("correct customer can reject SENT quotation", async () => {
    const response = await jsonRequest("/api/customer/quotations/q-6/reject", "POST", { reason: "Too expensive" }, "user-1");
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.data.status, "REJECTED");
    assert.equal(quotations["q-6"].status, "REJECTED");
  });

  it("rejected quotation cannot later be accepted", async () => {
    const response = await jsonRequest("/api/customer/quotations/q-6/accept", "POST", {}, "user-1");
    assert.equal(response.status, 409);
  });
  
  it("accepted quotation cannot later be rejected", async () => {
    const response = await jsonRequest("/api/customer/quotations/q-3/reject", "POST", {}, "user-1");
    assert.equal(response.status, 409);
  });

  it("Customer A cannot reject Customer B quotation", async () => {
    const response = await jsonRequest("/api/customer/quotations/q-4/reject", "POST", {}, "user-1");
    assert.equal(response.status, 404);
  });
});

describe("ROLE SECURITY", () => {
  it("SALES, MANAGER, FINANCE cannot use customer acceptance endpoint", async () => {
    const roles = ["SALESPERSON", "MANAGER", "FINANCE"];
    for (const role of roles) {
      const response = await jsonRequest("/api/customer/quotations/q-1/accept", "POST", {}, "sales-1", role);
      assert.equal(response.status, 403);
    }
  });
});
