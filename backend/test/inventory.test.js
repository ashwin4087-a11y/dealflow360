import assert from "node:assert/strict";
import { describe, it } from "node:test";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";
import {
  getProductStock,
  receiveStock,
} from "../src/services/inventoryService.js";

const product = { id: "product-1" };
process.env.JWT_SECRET = "inventory-test-secret";
const warehouses = {
  "warehouse-a": { id: "warehouse-a" },
  "warehouse-b": { id: "warehouse-b" },
};

const createPrismaMock = () => {
  const stock = new Map();
  const warehouseStock = {
    upsert: async ({ where, create, update }) => {
      const key = `${where.warehouseId_productId.warehouseId}:${where.warehouseId_productId.productId}`;
      const current = stock.get(key);
      const availableQuantity = current
        ? (Number(current.availableQuantity) + Number(update.availableQuantity.increment)).toFixed(2)
        : String(create.availableQuantity);
      const record = {
        id: current?.id || `stock-${stock.size + 1}`,
        warehouseId: create.warehouseId,
        productId: create.productId,
        availableQuantity,
        warehouse: { id: create.warehouseId, name: create.warehouseId, code: create.warehouseId },
        product: { id: create.productId, name: "Laptop", sku: "LAP-001", productType: "ONE_TIME" },
      };
      stock.set(key, record);
      return record;
    },
    findMany: async ({ where }) =>
      [...stock.values()].filter((item) => !where || item.productId === where.productId),
  };

  const prisma = {
    product: { findUnique: async () => product },
    warehouse: {
      findUnique: async ({ where }) => warehouses[where.id] || null,
    },
    warehouseStock,
    $transaction: async (callback) => callback(prisma),
  };
  return prisma;
};

describe("inventory receiving", () => {
  it("protects inventory endpoints with existing authentication middleware", async () => {
    const server = createApp({}).listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/api/inventory/stock`,
    );
    server.close();
    assert.equal(response.status, 401);
  });

  it("serves inventory through the authenticated API route", async () => {
    const prisma = createPrismaMock();
    const server = createApp(prisma).listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    const token = jwt.sign(
      { sub: "operations-1", role: "OPERATIONS" },
      process.env.JWT_SECRET,
    );
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/api/inventory/stock`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    const body = await response.json();
    server.close();
    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.deepEqual(body.data, []);
  });

  it("receives 60 in Warehouse A and 40 in Warehouse B for total stock of 100", async () => {
    const prisma = createPrismaMock();

    await receiveStock(prisma, {
      warehouseId: "warehouse-a",
      productId: "product-1",
      quantity: 60,
    });
    await receiveStock(prisma, {
      warehouseId: "warehouse-b",
      productId: "product-1",
      quantity: 40,
    });

    const result = await getProductStock(prisma, "product-1");
    assert.equal(result.totalAvailable, "100.00");
    assert.equal(result.warehouses.length, 2);
  });

  it("rejects negative, zero, and malformed quantities", async () => {
    const prisma = createPrismaMock();
    for (const quantity of [-1, 0, "-2", "invalid"]) {
      await assert.rejects(
        receiveStock(prisma, {
          warehouseId: "warehouse-a",
          productId: "product-1",
          quantity,
        }),
        { statusCode: 400 },
      );
    }
  });
});