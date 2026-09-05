import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createApp } from "../src/app.js";
import { confirmFulfillment } from "../src/services/fulfillmentService.js";

const createPrismaMock = ({ stockA = 60, stockB = 40, failSave = false } = {}) => {
  const fulfillment = new Map();
  const stocks = new Map([
    ["allocation-a", { id: "stock-a", availableQuantity: stockA, warehouseId: "warehouse-a", productId: "product-1" }],
    ["allocation-b", { id: "stock-b", availableQuantity: stockB, warehouseId: "warehouse-b", productId: "product-1" }],
  ]);
  const allocations = new Map([
    ["allocation-a", { id: "allocation-a", orderItemId: "order-item-1", warehouseId: "warehouse-a", productId: "product-1", allocatedQuantity: 60, fulfillment: null }],
    ["allocation-b", { id: "allocation-b", orderItemId: "order-item-1", warehouseId: "warehouse-b", productId: "product-1", allocatedQuantity: 40, fulfillment: null }],
  ]);

  const warehouse = (id) => ({ id, name: id === "warehouse-a" ? "Warehouse A" : "Warehouse B", code: id === "warehouse-a" ? "WH-A" : "WH-B", location: "Main" });
  const orderItem = {
    id: "order-item-1",
    orderId: "order-1",
    productId: "product-1",
    quantity: 100,
    product: { id: "product-1", name: "Laptop", sku: "LAP-001", productType: "ONE_TIME" },
  };
  const materializeAllocation = (allocation) => ({
    ...allocation,
    warehouse: warehouse(allocation.warehouseId),
    orderItem,
    fulfillment: allocation.fulfillment || fulfillment.get(allocation.id) || null,
  });

  const prisma = {
    allocation: {
      findUnique: async ({ where }) => allocations.has(where.id) ? materializeAllocation(allocations.get(where.id)) : null,
    },
    warehouseStock: {
      findUnique: async ({ where }) => {
        const allocation = [...allocations.values()].find(
          (item) =>
            item.warehouseId === where.warehouseId_productId.warehouseId &&
            item.productId === where.warehouseId_productId.productId,
        );
        return allocation ? stocks.get(allocation.id) : null;
      },
      updateMany: async ({ where, data }) => {
        const stock = [...stocks.values()].find((item) => item.id === where.id);
        if (!stock || stock.availableQuantity < Number(data.availableQuantity.decrement)) return { count: 0 };
        stock.availableQuantity -= Number(data.availableQuantity.decrement);
        return { count: 1 };
      },
    },
    fulfillment: {
      upsert: async ({ where, create, update }) => {
        if (failSave) throw new Error("Simulated persistence failure");
        const current = fulfillment.get(where.allocationId);
        const record = {
          id: current?.id || `fulfillment-${fulfillment.size + 1}`,
          allocationId: where.allocationId,
          fulfilledQuantity: current ? update.fulfilledQuantity : create.fulfilledQuantity,
          status: current ? update.status : create.status,
          allocation: materializeAllocation(allocations.get(where.allocationId)),
        };
        fulfillment.set(where.allocationId, record);
        allocations.get(where.allocationId).fulfillment = record;
        return record;
      },
    },
    $transaction: async (callback) => {
      const stockSnapshot = structuredClone(stocks);
      const fulfillmentSnapshot = structuredClone(fulfillment);
      try {
        return await callback(prisma);
      } catch (error) {
        stocks.clear();
        for (const [key, value] of stockSnapshot) stocks.set(key, value);
        fulfillment.clear();
        for (const [key, value] of fulfillmentSnapshot) fulfillment.set(key, value);
        throw error;
      }
    },
  };

  return { prisma, stocks, fulfillment };
};

describe("order fulfillment", () => {
  it("fulfills both allocations and reduces inventory to zero", async () => {
    const { prisma, stocks } = createPrismaMock();
    const first = await confirmFulfillment(prisma, "allocation-a", { quantity: 60 });
    const second = await confirmFulfillment(prisma, "allocation-b", { quantity: 40 });

    assert.equal(first.status, "FULFILLED");
    assert.equal(second.status, "FULFILLED");
    assert.equal(stocks.get("allocation-a").availableQuantity, 0);
    assert.equal(stocks.get("allocation-b").availableQuantity, 0);
  });

  it("supports partial fulfillment and retains the remaining allocation", async () => {
    const { prisma, stocks } = createPrismaMock();
    const result = await confirmFulfillment(prisma, "allocation-a", { quantity: 30 });

    assert.equal(result.status, "PARTIALLY_FULFILLED");
    assert.equal(result.fulfilledQuantity, "30");
    assert.equal(stocks.get("allocation-a").availableQuantity, 30);
  });

  it("rejects fulfillment above allocation or available stock", async () => {
    const allocationCase = createPrismaMock();
    await assert.rejects(
      confirmFulfillment(allocationCase.prisma, "allocation-a", { quantity: 61 }),
      { statusCode: 409 },
    );

    const stockCase = createPrismaMock({ stockA: 50 });
    await assert.rejects(
      confirmFulfillment(stockCase.prisma, "allocation-a", { quantity: 60 }),
      { statusCode: 409 },
    );
  });

  it("rejects zero and negative quantities and duplicate fulfillment", async () => {
    const { prisma } = createPrismaMock();
    for (const quantity of [0, -10, "invalid"]) {
      await assert.rejects(confirmFulfillment(prisma, "allocation-a", { quantity }), { statusCode: 400 });
    }
    await confirmFulfillment(prisma, "allocation-a", { quantity: 60 });
    await assert.rejects(confirmFulfillment(prisma, "allocation-a", { quantity: 1 }), { statusCode: 409 });
  });

  it("rolls back inventory when fulfillment persistence fails", async () => {
    const { prisma, stocks, fulfillment } = createPrismaMock({ failSave: true });
    await assert.rejects(confirmFulfillment(prisma, "allocation-a", { quantity: 60 }));
    assert.equal(stocks.get("allocation-a").availableQuantity, 60);
    assert.equal(fulfillment.size, 0);
  });

  it("protects fulfillment routes with existing authentication", async () => {
    const server = createApp({}).listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/fulfillment/records`);
    server.close();
    assert.equal(response.status, 401);
  });
});
