import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createApp } from "../src/app.js";
import {
  recommendAllocation,
  replaceAllocation,
} from "../src/services/allocationService.js";

const item = {
  id: "order-item-1",
  orderId: "order-1",
  productId: "product-1",
  quantity: 100,
  product: { id: "product-1", name: "Laptop", sku: "LAP-001", productType: "ONE_TIME" },
};

const createPrismaMock = ({ warehouseA = 60, warehouseB = 40 } = {}) => {
  const allocations = new Map();
  const stockRows = [
    {
      warehouseId: "warehouse-a",
      availableQuantity: String(warehouseA),
      warehouse: { id: "warehouse-a", name: "Warehouse A", code: "WH-A" },
    },
    {
      warehouseId: "warehouse-b",
      availableQuantity: String(warehouseB),
      warehouse: { id: "warehouse-b", name: "Warehouse B", code: "WH-B" },
    },
  ].filter((row) => Number(row.availableQuantity) >= 0);
  const warehouses = stockRows.map(({ warehouse }) => ({ id: warehouse.id }));

  const allocationApi = {
    deleteMany: async ({ where }) => {
      for (const [key, value] of allocations) {
        if (value.orderItemId === where.orderItemId) allocations.delete(key);
      }
    },
    create: async ({ data, select }) => {
      const key = `${data.orderItemId}:${data.warehouseId}`;
      if (allocations.has(key)) {
        const error = new Error("Duplicate allocation");
        error.code = "P2002";
        throw error;
      }
      const record = {
        id: `allocation-${allocations.size + 1}`,
        ...data,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        warehouse: stockRows.find((row) => row.warehouseId === data.warehouseId).warehouse,
      };
      allocations.set(key, record);
      return record;
    },
    findMany: async ({ where }) =>
      [...allocations.values()].filter((value) => value.orderItemId === where.orderItemId),
  };

  const prisma = {
    orderItem: {
      findUnique: async ({ where }) => (where.id === item.id ? item : null),
      findMany: async () => [{ ...item, allocations: [...allocations.values()] }],
    },
    order: {
      findUnique: async ({ where }) =>
        where.id === item.orderId ? { id: item.orderId, orderNumber: "ORD-1" } : null,
    },
    warehouse: {
      findMany: async ({ where }) =>
        warehouses.filter(({ id }) => where.id.in.includes(id)),
    },
    warehouseStock: {
      findMany: async ({ where }) =>
        stockRows.filter(
          (row) =>
            row.warehouseId === where.productId && false ||
            (!where.warehouseId || where.warehouseId.in.includes(row.warehouseId)),
        ),
    },
    allocation: allocationApi,
    $transaction: async (callback) => callback(prisma),
  };

  prisma.warehouseStock.findMany = async ({ where }) =>
    stockRows.filter(
      (row) =>
        where.productId === item.productId &&
        (!where.warehouseId || where.warehouseId.in.includes(row.warehouseId)),
    );

  return { prisma, allocations };
};

describe("warehouse allocation", () => {
  it("recommends the exact 60/40 split without persisting allocations", async () => {
    const { prisma, allocations } = createPrismaMock();
    const result = await recommendAllocation(prisma, item.id);

    assert.equal(result.totalRecommended, "100.00");
    assert.equal(result.remainingQuantity, "0.00");
    assert.deepEqual(
      result.allocations.map(({ warehouseId, allocatedQuantity }) => ({ warehouseId, allocatedQuantity })),
      [
        { warehouseId: "warehouse-a", allocatedQuantity: "60.00" },
        { warehouseId: "warehouse-b", allocatedQuantity: "40.00" },
      ],
    );
    assert.equal(allocations.size, 0);
  });

  it("recommends only the available 80 when stock is 60/20", async () => {
    const { prisma } = createPrismaMock({ warehouseB: 20 });
    const result = await recommendAllocation(prisma, item.id);

    assert.equal(result.totalRecommended, "80.00");
    assert.equal(result.remainingQuantity, "20.00");
    assert.equal(result.allocations.length, 2);
  });

  it("persists a valid 70/30 manual override", async () => {
    const { prisma, allocations } = createPrismaMock({ warehouseA: 70 });
    const result = await replaceAllocation(prisma, item.id, {
      allocations: [
        { warehouseId: "warehouse-a", quantity: 70 },
        { warehouseId: "warehouse-b", quantity: 30 },
      ],
    });

    assert.deepEqual(result.map(({ warehouseId, allocatedQuantity }) => ({ warehouseId, allocatedQuantity })), [
      { warehouseId: "warehouse-a", allocatedQuantity: "70.00" },
      { warehouseId: "warehouse-b", allocatedQuantity: "30.00" },
    ]);
    assert.equal(allocations.size, 2);
  });

  it("rejects total over-allocation", async () => {
    const { prisma } = createPrismaMock();
    await assert.rejects(
      replaceAllocation(prisma, item.id, {
        allocations: [
          { warehouseId: "warehouse-a", quantity: 80 },
          { warehouseId: "warehouse-b", quantity: 40 },
        ],
      }),
      { statusCode: 409 },
    );
  });

  it("rejects allocation above warehouse stock", async () => {
    const { prisma } = createPrismaMock({ warehouseB: 0 });
    await assert.rejects(
      replaceAllocation(prisma, item.id, {
        allocations: [{ warehouseId: "warehouse-a", quantity: 61 }],
      }),
      { statusCode: 409 },
    );
  });

  it("rejects duplicate, zero, and negative allocation entries", async () => {
    const { prisma } = createPrismaMock();
    for (const allocations of [
      [
        { warehouseId: "warehouse-a", quantity: 50 },
        { warehouseId: "warehouse-a", quantity: 50 },
      ],
      [{ warehouseId: "warehouse-a", quantity: 0 }],
      [{ warehouseId: "warehouse-a", quantity: -1 }],
    ]) {
      await assert.rejects(
        replaceAllocation(prisma, item.id, { allocations }),
        (error) => error.statusCode === 400 || error.statusCode === 409,
      );
    }
  });

  it("protects allocation routes with existing authentication", async () => {
    const server = createApp({}).listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/api/allocations/order-items/${item.id}/recommendation`,
    );
    server.close();
    assert.equal(response.status, 401);
  });
});
