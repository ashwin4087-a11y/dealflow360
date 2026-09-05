import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";
import { getProductPrice } from "../src/services/pricingService.js";

process.env.JWT_SECRET = "test-secret";

const activeProduct = {
  id: "product-1",
  name: "Laptop",
  sku: "LAP-001",
  description: "Business laptop",
  category: "Hardware",
  productType: "ONE_TIME",
  basePrice: "80000.00",
  active: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  internalCost: "60000.00",
};

const inactiveProduct = {
  ...activeProduct,
  id: "product-2",
  name: "Legacy Monitor",
  sku: "MON-001",
  basePrice: "30000.00",
  active: false,
};

let records;
let server;
let baseUrl;

const tokenFor = (role = "SALESPERSON") =>
  jwt.sign({ sub: "user-1", role }, process.env.JWT_SECRET);

const publicProduct = (product) => ({
  id: product.id,
  name: product.name,
  sku: product.sku,
  description: product.description,
  category: product.category,
  productType: product.productType,
  basePrice: product.basePrice,
  active: product.active,
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
});

const prismaMock = {
  product: {
    findMany: async () => Object.values(records),
    findUnique: async ({ where }) => records[where.id] || null,
    create: async ({ data }) => {
      const created = {
        ...data,
        id: "product-3",
        createdAt: "2026-01-03T00:00:00.000Z",
        updatedAt: "2026-01-03T00:00:00.000Z",
      };
      records[created.id] = created;
      return created;
    },
    update: async ({ where, data }) => {
      if (!records[where.id]) {
        const error = new Error("Missing product");
        error.code = "P2025";
        throw error;
      }
      records[where.id] = { ...records[where.id], ...data };
      return records[where.id];
    },
  },
};

before(async () => {
  records = {
    [activeProduct.id]: { ...activeProduct },
    [inactiveProduct.id]: { ...inactiveProduct },
  };
  server = createApp(prismaMock).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

const request = (path, options = {}) => fetch(`${baseUrl}${path}`, options);
const authenticated = (role = "SALESPERSON", options = {}) => ({
  ...options,
  headers: { authorization: `Bearer ${tokenFor(role)}`, ...options.headers },
});
const jsonRequest = (path, method, body, role = "SALESPERSON") =>
  request(
    path,
    authenticated(role, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

describe("product management", () => {
  it("rejects unauthenticated requests and allows internal users to list products", async () => {
    const unauthenticated = await request("/api/products");
    const response = await request("/api/products", authenticated());
    const body = await response.json();

    assert.equal(unauthenticated.status, 401);
    assert.equal(response.status, 200);
    assert.equal(body.data[0].basePrice, "80000.00");
    assert.equal("internalCost" in body.data[0], false);
  });

  it("creates a valid product and rejects invalid product data", async () => {
    const created = await jsonRequest("/api/products", "POST", {
      name: "  Subscription Monitor ",
      sku: "MON-002",
      description: "Monthly monitor rental",
      category: "Hardware",
      productType: "recurring",
      basePrice: "30000.00",
      active: true,
    });
    const missingName = await jsonRequest("/api/products", "POST", {
      sku: "BAD-001",
      category: "Hardware",
      productType: "ONE_TIME",
      basePrice: "1",
    });
    const negativePrice = await jsonRequest("/api/products", "POST", {
      name: "Bad",
      sku: "BAD-002",
      category: "Hardware",
      productType: "ONE_TIME",
      basePrice: "-1",
    });
    const malformedPrice = await jsonRequest("/api/products", "POST", {
      name: "Bad",
      sku: "BAD-003",
      category: "Hardware",
      productType: "ONE_TIME",
      basePrice: "Infinity",
    });
    const invalidType = await jsonRequest("/api/products", "POST", {
      name: "Bad",
      sku: "BAD-004",
      category: "Hardware",
      productType: "SERVICE",
      basePrice: "1",
    });

    assert.equal(created.status, 201);
    assert.equal((await created.json()).data.name, "Subscription Monitor");
    assert.equal(missingName.status, 400);
    assert.equal(negativePrice.status, 400);
    assert.equal(malformedPrice.status, 400);
    assert.equal(invalidType.status, 400);
  });

  it("gets and updates products, and handles missing products", async () => {
    const getResponse = await request(
      `/api/products/${activeProduct.id}`,
      authenticated(),
    );
    const updateResponse = await jsonRequest(
      `/api/products/${activeProduct.id}`,
      "PUT",
      {
        name: "Updated Laptop",
        basePrice: "81000.00",
      },
    );
    const missingResponse = await request(
      "/api/products/missing",
      authenticated(),
    );

    assert.equal(getResponse.status, 200);
    assert.equal((await getResponse.json()).data.id, activeProduct.id);
    assert.equal(updateResponse.status, 200);
    assert.equal((await updateResponse.json()).data.basePrice, "81000.00");
    assert.equal(missingResponse.status, 404);
  });

  it("does not allow CUSTOMER users to manage products", async () => {
    const response = await request("/api/products", authenticated("CUSTOMER"));
    assert.equal(response.status, 403);
  });
});

describe("backend pricing service", () => {
  it("returns the product database price and ignores request-supplied prices", async () => {
    const price = await getProductPrice(prismaMock, activeProduct.id, "0.01");
    assert.equal(price, "81000.00");
  });

  it("rejects inactive and unknown products", async () => {
    await assert.rejects(
      () => getProductPrice(prismaMock, inactiveProduct.id),
      (error) => error.statusCode === 400,
    );
    await assert.rejects(
      () => getProductPrice(prismaMock, "unknown"),
      (error) => error.statusCode === 404,
    );
  });
});
