import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createApp } from "../src/app.js";
import {
  fulfillBackorder,
  fulfillEligibleBackorders,
  syncBackorderForOrderItem,
} from "../src/services/backorderService.js";

const createPrismaMock = ({ stock = 80, failUpdate = false } = {}) => {
  const backorders = new Map();
  const stockRows = new Map([
    ["warehouse-a", { id: "stock-a", warehouseId: "warehouse-a", productId: "product-1", availableQuantity: stock }],
  ]);
  const item = {
    id: "order-item-1",
    orderId: "order-1",
    productId: "product-1",
    quantity: 100,
    allocations: [{ fulfillment: { fulfilledQuantity: 80 } }],
  };
  const product = { id: "product-1", name: "Laptop", sku: "LAP-001", productType: "ONE_TIME" };
  const warehouse = { id: "warehouse-a", name: "Warehouse A", code: "WH-A", location: "Main" };
  const full = (record) => ({
    ...record,
    order: { id: "order-1", orderNumber: "ORD-1" },
    orderItem: { id: item.id, orderId: item.orderId, productId: item.productId, quantity: item.quantity },
    product,
  });
  const backorderApi = {
    findFirst: async ({ where }) => [...backorders.values()].find((row) => row.orderItemId === where.orderItemId && where.status.in.includes(row.status)) || null,
    findMany: async ({ where }) => [...backorders.values()].filter((row) => (!where.productId || row.productId === where.productId) && (!where.orderItemId || row.orderItemId === where.orderItemId) && (!where.status || where.status.in.includes(row.status))).map(full),
    findUnique: async ({ where }) => backorders.has(where.id) ? full(backorders.get(where.id)) : null,
    create: async ({ data }) => {
      const record = { id: `backorder-${backorders.size + 1}`, ...data, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
      backorders.set(record.id, record);
      return full(record);
    },
    update: async ({ where, data }) => {
      const record = backorders.get(where.id);
      Object.assign(record, data, {
        fulfilledQuantity: data.fulfilledQuantity?.increment !== undefined ? Number(record.fulfilledQuantity) + Number(data.fulfilledQuantity.increment) : record.fulfilledQuantity,
      });
      if (data.fulfilledQuantity?.increment !== undefined) delete record.fulfilledQuantity.increment;
      return full(record);
    },
    updateMany: async ({ where, data }) => {
      const record = backorders.get(where.id);
      if (!record || !where.status.in.includes(record.status)) return { count: 0 };
      record.status = data.status;
      return { count: 1 };
    },
  };
  const prisma = {
    backorder: backorderApi,
    orderItem: { findUnique: async ({ where }) => where.id === item.id ? item : null },
    warehouse: { findUnique: async ({ where }) => where.id === warehouse.id ? warehouse : null },
    warehouseStock: {
      findUnique: async ({ where }) => {
        const row = stockRows.get(where.warehouseId_productId.warehouseId);
        return row && row.productId === where.warehouseId_productId.productId ? row : null;
      },
      updateMany: async ({ where, data }) => {
        const row = [...stockRows.values()].find((entry) => entry.id === where.id);
        if (!row || row.availableQuantity < Number(data.availableQuantity.decrement)) return { count: 0 };
        if (failUpdate) throw new Error("Simulated stock failure");
        row.availableQuantity -= Number(data.availableQuantity.decrement);
        return { count: 1 };
      },
    },
    order: { findUnique: async () => ({ id: "order-1", orderNumber: "ORD-1" }) },
    $transaction: async (callback) => {
      const stockSnapshot = structuredClone(stockRows);
      const backorderSnapshot = structuredClone(backorders);
      try { return await callback(prisma); } catch (error) {
        stockRows.clear();
        for (const [key, value] of stockSnapshot) stockRows.set(key, value);
        backorders.clear();
        for (const [key, value] of backorderSnapshot) backorders.set(key, value);
        throw error;
      }
    },
  };
  return { prisma, stockRows, backorders, item };
};

describe("backorder management", () => {
  it("creates 20 backordered units when 80 of 100 are fulfilled", async () => {
    const { prisma, backorders } = createPrismaMock();
    const result = await syncBackorderForOrderItem(prisma, "order-item-1");
    assert.equal(result.remainingQuantity, "20.00");
    assert.equal(backorders.size, 1);
  });

  it("does not create a backorder when all 100 are fulfilled", async () => {
    const { prisma, backorders, item } = createPrismaMock();
    item.allocations[0].fulfillment.fulfilledQuantity = 100;
    const result = await syncBackorderForOrderItem(prisma, item.id);
    assert.equal(result, null);
    assert.equal(backorders.size, 0);
  });

  it("uses 30 received units to fulfill a 20-unit backorder and leaves 10", async () => {
    const { prisma, backorders, stockRows } = createPrismaMock({ stock: 30 });
    const created = await syncBackorderForOrderItem(prisma, "order-item-1");
    const result = await fulfillEligibleBackorders(prisma, "warehouse-a", "product-1");
    assert.equal(result[0].status, "FULFILLED");
    assert.equal(result[0].remainingQuantity, "0.00");
    assert.equal(stockRows.get("warehouse-a").availableQuantity, 10);
    assert.equal(backorders.size, 1);
    assert.ok(created.id);
  });

  it("prevents duplicate open backorders and over-fulfillment", async () => {
    const { prisma, backorders } = createPrismaMock();
    await syncBackorderForOrderItem(prisma, "order-item-1");
    await syncBackorderForOrderItem(prisma, "order-item-1");
    assert.equal(backorders.size, 1);
    await assert.rejects(fulfillBackorder(prisma, "backorder-1", { warehouseId: "warehouse-a", quantity: 21 }), { statusCode: 409 });
  });

  it("rejects zero, negative, malformed, unknown warehouse, and prevents rollback", async () => {
    const invalid = createPrismaMock();
    await syncBackorderForOrderItem(invalid.prisma, "order-item-1");
    for (const quantity of [0, -1, "bad"]) {
      await assert.rejects(fulfillBackorder(invalid.prisma, "backorder-1", { warehouseId: "warehouse-a", quantity }), { statusCode: 400 });
    }
    await assert.rejects(fulfillBackorder(invalid.prisma, "backorder-1", { warehouseId: "missing", quantity: 1 }), { statusCode: 404 });

    const rollback = createPrismaMock({ stock: 30, failUpdate: true });
    await syncBackorderForOrderItem(rollback.prisma, "order-item-1");
    await assert.rejects(fulfillBackorder(rollback.prisma, "backorder-1", { warehouseId: "warehouse-a", quantity: 20 }));
    assert.equal(rollback.stockRows.get("warehouse-a").availableQuantity, 30);
    assert.equal(rollback.backorders.get("backorder-1").fulfilledQuantity, "0.00");
  });

  it("protects backorder routes with existing authentication", async () => {
    const server = createApp({}).listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/backorders/orders/order-1`);
    server.close();
    assert.equal(response.status, 401);
  });
});
