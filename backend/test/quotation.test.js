import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";
import {
  getApplicableDiscountRule,
  validateLineDiscount,
} from "../src/services/discountService.js";

process.env.JWT_SECRET = "test-secret";

const customer = {
  id: "customer-1",
  name: "ABC Corporation",
  email: "abc@example.com",
  company: "ABC Corporation",
  customerTier: "GOLD",
};
const products = {
  "product-1": {
    id: "product-1",
    name: "Laptop",
    sku: "LAP-001",
    category: "Hardware",
    productType: "ONE_TIME",
    basePrice: "80000.00",
    active: true,
  },
  "product-2": {
    id: "product-2",
    name: "Monitor",
    sku: "MON-001",
    category: "Hardware",
    productType: "ONE_TIME",
    basePrice: "30000.00",
    active: true,
  },
  inactive: {
    id: "inactive",
    name: "Legacy",
    sku: "LEG-001",
    category: "Hardware",
    productType: "ONE_TIME",
    basePrice: "100.00",
    active: false,
  },
  "product-3": {
    id: "product-3",
    name: "Support Service",
    sku: "SUP-001",
    category: "Software",
    productType: "RECURRING",
    basePrice: "1000.00",
    active: true,
  },
};

let quotations;
let quotationItems;
let nextQuotationId;
let transactionCount;
let server;
let baseUrl;

const tokenFor = (role = "SALESPERSON") =>
  jwt.sign({ sub: "sales-1", role }, process.env.JWT_SECRET);
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

const quotationView = (quotation) => ({
  ...quotation,
  customer,
  salesperson: {
    id: quotation.salespersonId,
    name: "Salesperson",
    email: "sales@example.com",
    role: "SALESPERSON",
    passwordHash: "secret",
  },
  items: quotationItems
    .filter((item) => item.quotationId === quotation.id)
    .map((item) => ({ ...item, product: products[item.productId] })),
});

const prismaMock = {
  customer: {
    findUnique: async ({ where }) =>
      where.id === customer.id ? customer : null,
  },
  product: {
    findUnique: async ({ where }) => products[where.id] || null,
  },
  discountRule: {
    findUnique: async ({ where }) => {
      const key = where.customerTier_productCategory;
      if (key.customerTier === "GOLD" && key.productCategory === "Hardware") {
        return { maxDiscountPercent: "10.00" };
      }
      return null;
    },
  },
  quotation: {
    findMany: async () => Object.values(quotations).map(quotationView),
    findUnique: async ({ where }) => {
      const quotation = quotations[where.id];
      return quotation ? quotationView(quotation) : null;
    },
    create: async ({ data }) => {
      const id = `quotation-${nextQuotationId++}`;
      const quotation = {
        ...data,
        id,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };
      const nestedItems = quotation.items?.create || [];
      delete quotation.items;
      quotations[id] = quotation;
      for (const item of nestedItems)
        quotationItems.push({
          ...item,
          id: `item-${quotationItems.length + 1}`,
          quotationId: id,
        });
      return quotationView(quotation);
    },
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
      const nestedItems = quotations[where.id].items?.create || [];
      delete quotations[where.id].items;
      for (const item of nestedItems)
        quotationItems.push({
          ...item,
          id: `item-${quotationItems.length + 1}`,
          quotationId: where.id,
        });
      return quotations[where.id];
    },
  },
  quotationItem: {
    deleteMany: async ({ where }) => {
      quotationItems = quotationItems.filter(
        (item) => item.quotationId !== where.quotationId,
      );
    },
  },
  $transaction: async (callback) => {
    transactionCount += 1;
    return callback(prismaMock);
  },
};

before(async () => {
  quotations = {};
  quotationItems = [];
  nextQuotationId = 1;
  transactionCount = 0;
  server = createApp(prismaMock).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

const validQuote = (overrides = {}) => ({
  customerId: customer.id,
  taxPercent: "18",
  items: [
    { productId: "product-1", quantity: "2" },
    { productId: "product-2", quantity: "3" },
  ],
  ...overrides,
});

let createdQuotationId;

describe("quotation authorization and validation", () => {
  it("rejects unauthenticated and CUSTOMER requests", async () => {
    const unauthenticated = await request("/api/quotations");
    const customerRole = await jsonRequest(
      "/api/quotations",
      "POST",
      validQuote(),
      "CUSTOMER",
    );
    assert.equal(unauthenticated.status, 401);
    assert.equal(customerRole.status, 403);
  });

  it("rejects an unknown customer, unknown product, inactive product, and invalid quantity", async () => {
    const unknownCustomer = await jsonRequest(
      "/api/quotations",
      "POST",
      validQuote({ customerId: "missing" }),
    );
    const unknownProduct = await jsonRequest(
      "/api/quotations",
      "POST",
      validQuote({ items: [{ productId: "missing", quantity: "1" }] }),
    );
    const inactiveProduct = await jsonRequest(
      "/api/quotations",
      "POST",
      validQuote({ items: [{ productId: "inactive", quantity: "1" }] }),
    );
    const zeroQuantity = await jsonRequest(
      "/api/quotations",
      "POST",
      validQuote({ items: [{ productId: "product-1", quantity: "0" }] }),
    );
    const malformedQuantity = await jsonRequest(
      "/api/quotations",
      "POST",
      validQuote({ items: [{ productId: "product-1", quantity: "Infinity" }] }),
    );

    assert.equal(unknownCustomer.status, 404);
    assert.equal(unknownProduct.status, 404);
    assert.equal(inactiveProduct.status, 400);
    assert.equal(zeroQuantity.status, 400);
    assert.equal(malformedQuantity.status, 400);
  });

  it("rejects client-calculated fields and invalid tax", async () => {
    const clientTotal = await jsonRequest(
      "/api/quotations",
      "POST",
      validQuote({ subtotal: "1" }),
    );
    const clientPrice = await jsonRequest(
      "/api/quotations",
      "POST",
      validQuote({
        items: [{ productId: "product-1", quantity: "1", unitPrice: "1" }],
      }),
    );
    const invalidTax = await jsonRequest(
      "/api/quotations",
      "POST",
      validQuote({ taxPercent: "Infinity" }),
    );

    assert.equal(clientTotal.status, 400);
    assert.equal(clientPrice.status, 400);
    assert.equal(invalidTax.status, 400);
  });
});

describe("quotation creation and calculations", () => {
  it("creates a DRAFT with backend prices, duplicate lines, and calculated totals", async () => {
    const response = await jsonRequest(
      "/api/quotations",
      "POST",
      validQuote({
        items: [
          { productId: "product-1", quantity: "2" },
          { productId: "product-1", quantity: "1" },
          { productId: "product-2", quantity: "3" },
        ],
      }),
    );
    const body = await response.json();
    createdQuotationId = body.data.id;

    assert.equal(response.status, 201);
    assert.equal(body.data.status, "DRAFT");
    assert.equal(body.data.subtotal, "330000.00");
    assert.equal(body.data.taxAmount, "59400.00");
    assert.equal(body.data.total, "389400.00");
    assert.equal(body.data.discountPercent, "0");
    assert.equal(body.data.discountAmount, "0.00");
    assert.equal(body.data.marginAmount, "0.00");
    assert.equal(body.data.items.length, 3);
    assert.equal(body.data.items[0].unitPrice, "80000.00");
    assert.equal(body.data.items[0].lineTotal, "160000.00");
    assert.equal("passwordHash" in body.data.salesperson, false);
  });

  it("lists and retrieves quotations with items, and returns 404 for missing IDs", async () => {
    const listResponse = await request("/api/quotations", authenticated());
    const getResponse = await request(
      `/api/quotations/${createdQuotationId}`,
      authenticated(),
    );
    const missingResponse = await request(
      "/api/quotations/missing",
      authenticated(),
    );

    assert.equal(listResponse.status, 200);
    assert.equal((await listResponse.json()).data.length, 1);
    assert.equal(getResponse.status, 200);
    assert.equal((await getResponse.json()).data.items.length, 3);
    assert.equal(missingResponse.status, 404);
  });
});

describe("quotation updates and atomicity", () => {
  it("updates only DRAFT quotations and recalculates totals", async () => {
    const response = await jsonRequest(
      `/api/quotations/${createdQuotationId}`,
      "PUT",
      validQuote({
        taxPercent: "10",
        items: [{ productId: "product-1", quantity: "1" }],
      }),
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.data.subtotal, "80000.00");
    assert.equal(body.data.taxAmount, "8000.00");
    assert.equal(body.data.total, "88000.00");
  });

  it("does not leave writes behind when an item fails validation", async () => {
    const beforeCount = Object.keys(quotations).length;
    const beforeTransactions = transactionCount;
    const response = await jsonRequest(
      "/api/quotations",
      "POST",
      validQuote({
        items: [
          { productId: "product-1", quantity: "1" },
          { productId: "missing", quantity: "1" },
        ],
      }),
    );

    assert.equal(response.status, 404);
    assert.equal(Object.keys(quotations).length, beforeCount);
    assert.equal(transactionCount, beforeTransactions);
  });

  it("rejects updates to non-DRAFT quotations", async () => {
    quotations[createdQuotationId].status = "APPROVED";
    const response = await jsonRequest(
      `/api/quotations/${createdQuotationId}`,
      "PUT",
      validQuote(),
    );
    assert.equal(response.status, 409);
  });
});

describe("line-level discount governance", () => {
  it("calculates discounts, discounted subtotal, tax, and total from backend data", async () => {
    const response = await jsonRequest("/api/quotations", "POST", {
      customerId: customer.id,
      taxPercent: "18",
      items: [
        { productId: "product-1", quantity: "2", discountPercent: "10" },
        { productId: "product-2", quantity: "3", discountPercent: "0" },
      ],
    });
    const body = await response.json();
    const [laptop, monitor] = body.data.items;

    assert.equal(response.status, 201);
    assert.equal(laptop.discountAmount, "16000.00");
    assert.equal(laptop.lineTotal, "144000.00");
    assert.equal(laptop.maxAllowedDiscountPercent, "10.00");
    assert.equal(laptop.compliant, true);
    assert.equal(monitor.discountAmount, "0.00");
    assert.equal(monitor.compliant, true);
    assert.equal(body.data.subtotal, "234000.00");
    assert.equal(body.data.taxAmount, "42120.00");
    assert.equal(body.data.total, "276120.00");
    assert.equal(body.data.discountAmount, "16000.00");
  });

  it("retains an above-limit request and reports it as non-compliant", async () => {
    const response = await jsonRequest("/api/quotations", "POST", {
      customerId: customer.id,
      items: [
        { productId: "product-1", quantity: "1", discountPercent: "12" },
        { productId: "product-2", quantity: "1", discountPercent: "5" },
      ],
    });
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.data.items[0].discountPercent, "12");
    assert.equal(body.data.items[0].maxAllowedDiscountPercent, "10.00");
    assert.equal(body.data.items[0].compliant, false);
    assert.equal(body.data.items[1].compliant, true);
  });

  it("rejects invalid discounts and client governance fields", async () => {
    const negative = await jsonRequest("/api/quotations", "POST", {
      customerId: customer.id,
      items: [{ productId: "product-1", quantity: "1", discountPercent: "-1" }],
    });
    const overLimit = await jsonRequest("/api/quotations", "POST", {
      customerId: customer.id,
      items: [
        { productId: "product-1", quantity: "1", discountPercent: "101" },
      ],
    });
    const malformed = await jsonRequest("/api/quotations", "POST", {
      customerId: customer.id,
      items: [
        { productId: "product-1", quantity: "1", discountPercent: "Infinity" },
      ],
    });
    const spoofedTier = await jsonRequest("/api/quotations", "POST", {
      customerId: customer.id,
      customerTier: "GOLD",
      items: [{ productId: "product-1", quantity: "1", discountPercent: "1" }],
    });
    const spoofedAmount = await jsonRequest("/api/quotations", "POST", {
      customerId: customer.id,
      items: [
        {
          productId: "product-1",
          quantity: "1",
          discountPercent: "1",
          discountAmount: "0",
        },
      ],
    });

    assert.equal(negative.status, 400);
    assert.equal(overLimit.status, 400);
    assert.equal(malformed.status, 400);
    assert.equal(spoofedTier.status, 400);
    assert.equal(spoofedAmount.status, 400);
  });

  it("uses actual customer and product data and restricts missing rules", async () => {
    const missingRule = await getApplicableDiscountRule(
      prismaMock,
      "GOLD",
      "Unknown",
    );
    const actualRule = await validateLineDiscount(prismaMock, {
      customerTier: customer.customerTier,
      productCategory: products["product-1"].category,
      discountPercent: "10",
    });

    assert.deepEqual(missingRule, {
      maxAllowedDiscountPercent: "0",
      ruleFound: false,
    });
    assert.equal(actualRule.maxAllowedDiscountPercent, "10.00");
    assert.equal(actualRule.compliant, true);
  });
});
