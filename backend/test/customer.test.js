import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";

process.env.JWT_SECRET = "test-secret";

const customer = {
  id: "customer-1",
  name: "ABC Corporation",
  email: "contact@abc.example",
  phone: "+91 9876543210",
  company: "ABC Corporation",
  customerTier: "GOLD",
  billingAddress: "1 Billing Street",
  shippingAddress: "2 Shipping Street",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

let records;
let server;
let baseUrl;

const salesToken = () =>
  jwt.sign({ sub: "sales-1", role: "SALESPERSON" }, process.env.JWT_SECRET);

const prismaMock = {
  customer: {
    findMany: async () => Object.values(records),
    findUnique: async ({ where }) => records[where.id] || null,
    create: async ({ data }) => {
      const created = {
        ...data,
        id: "customer-2",
        createdAt: "2026-01-02T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      };
      records[created.id] = created;
      return created;
    },
    update: async ({ where, data }) => {
      if (!records[where.id]) {
        const error = new Error("Missing customer");
        error.code = "P2025";
        throw error;
      }
      records[where.id] = { ...records[where.id], ...data };
      return records[where.id];
    },
  },
};

before(async () => {
  records = { [customer.id]: { ...customer, passwordHash: "must-not-leak" } };
  server = createApp(prismaMock).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

const request = (path, options = {}) => fetch(`${baseUrl}${path}`, options);
const authenticated = (options = {}) => ({
  ...options,
  headers: { authorization: `Bearer ${salesToken()}`, ...options.headers },
});
const jsonRequest = (path, method, body, options = {}) =>
  request(
    path,
    authenticated({
      ...options,
      method,
      headers: { "content-type": "application/json", ...options.headers },
      body: JSON.stringify(body),
    }),
  );

describe("customer management", () => {
  it("rejects unauthenticated customer requests", async () => {
    const response = await request("/api/customers");
    assert.equal(response.status, 401);
  });

  it("lists customers without exposing password hashes", async () => {
    const response = await request("/api/customers", authenticated());
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data[0].name, customer.name);
    assert.equal("passwordHash" in body.data[0], false);
  });

  it("creates a valid customer with a normalized tier", async () => {
    const response = await jsonRequest("/api/customers", "POST", {
      name: "  New Customer  ",
      email: "new@example.com",
      customerTier: "gold",
    });
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.data.name, "New Customer");
    assert.equal(body.data.customerTier, "GOLD");
    assert.equal("passwordHash" in body.data, false);
  });

  it("rejects missing name, invalid email, invalid tier, and unsupported fields", async () => {
    const missingName = await jsonRequest("/api/customers", "POST", {
      email: "a@example.com",
    });
    const invalidEmail = await jsonRequest("/api/customers", "POST", {
      name: "Customer",
      email: "invalid",
    });
    const invalidTier = await jsonRequest("/api/customers", "POST", {
      name: "Customer",
      customerTier: "VIP",
    });
    const unsupported = await jsonRequest("/api/customers", "POST", {
      name: "Customer",
      role: "ADMIN",
    });

    assert.equal(missingName.status, 400);
    assert.equal(invalidEmail.status, 400);
    assert.equal(invalidTier.status, 400);
    assert.equal(unsupported.status, 400);
  });

  it("gets and updates an existing customer", async () => {
    const getResponse = await request(
      `/api/customers/${customer.id}`,
      authenticated(),
    );
    const updateResponse = await jsonRequest(
      `/api/customers/${customer.id}`,
      "PUT",
      {
        name: "ABC Corporation Updated",
        customerTier: "SILVER",
      },
    );
    const updatedBody = await updateResponse.json();

    assert.equal(getResponse.status, 200);
    assert.equal((await getResponse.json()).data.id, customer.id);
    assert.equal(updateResponse.status, 200);
    assert.equal(updatedBody.data.name, "ABC Corporation Updated");
    assert.equal(updatedBody.data.customerTier, "SILVER");
  });

  it("returns 404 for a missing customer and rejects invalid updates", async () => {
    const missing = await request("/api/customers/missing", authenticated());
    const invalidUpdate = await jsonRequest(
      `/api/customers/${customer.id}`,
      "PUT",
      {
        email: "invalid",
      },
    );

    assert.equal(missing.status, 404);
    assert.equal(invalidUpdate.status, 400);
  });

  it("does not allow CUSTOMER users to manage the customer database", async () => {
    const token = jwt.sign(
      { sub: "customer-user", role: "CUSTOMER" },
      process.env.JWT_SECRET,
    );
    const response = await request("/api/customers", {
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(response.status, 403);
  });
});
