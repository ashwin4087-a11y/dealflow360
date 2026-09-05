const INTERNAL_ROLES = ["ADMIN", "SALES", "MANAGER", "FINANCE", "OPERATIONS"];
import { syncBackorderForOrderItem } from "./backorderService.js";

const serviceError = (message, statusCode) =>
  Object.assign(new Error(message), { statusCode });

const FULFILLMENT_SELECT = {
  id: true,
  allocationId: true,
  fulfilledQuantity: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  allocation: {
    select: {
      id: true,
      orderItemId: true,
      warehouseId: true,
      allocatedQuantity: true,
      fulfillment: { select: { id: true, fulfilledQuantity: true, status: true } },
      warehouse: { select: { id: true, name: true, code: true, location: true } },
      orderItem: {
        select: {
          id: true,
          orderId: true,
          productId: true,
          quantity: true,
          product: { select: { id: true, name: true, sku: true, productType: true } },
        },
      },
    },
  },
};

const positiveQuantity = (value) => {
  if (typeof value !== "string" && typeof value !== "number") {
    throw serviceError("quantity must be numeric", 400);
  }
  const normalized = String(value).trim();
  const parsed = Number(normalized);
  if (!/^\d+(\.\d{1,2})?$/.test(normalized) || !Number.isFinite(parsed) || parsed <= 0) {
    throw serviceError("quantity must be greater than zero with up to two decimals", 400);
  }
  return parsed;
};

const numberValue = (value) => Number(value);

const serialize = (fulfillment) => ({
  ...fulfillment,
  fulfilledQuantity: fulfillment.fulfilledQuantity.toString(),
  allocation: {
    ...fulfillment.allocation,
    allocatedQuantity: fulfillment.allocation.allocatedQuantity.toString(),
    orderItem: {
      ...fulfillment.allocation.orderItem,
      quantity: fulfillment.allocation.orderItem.quantity,
    },
  },
});

const allocationWithFulfillment = async (transaction, allocationId) => {
  const allocation = await transaction.allocation.findUnique({
    where: { id: allocationId },
    select: {
      id: true,
      orderItemId: true,
      warehouseId: true,
      allocatedQuantity: true,
      warehouse: { select: { id: true, name: true, code: true, location: true } },
      orderItem: {
        select: {
          id: true,
          orderId: true,
          productId: true,
          quantity: true,
          product: { select: { id: true, name: true, sku: true, productType: true } },
        },
      },
      fulfillment: { select: { id: true, fulfilledQuantity: true, status: true } },
    },
  });
  if (!allocation) throw serviceError("Allocation not found", 404);
  if (!allocation.warehouse) throw serviceError("Warehouse not found", 404);
  if (!allocation.orderItem?.product) throw serviceError("Product not found", 404);
  return allocation;
};

export const confirmFulfillment = async (prismaClient, allocationId, input) => {
  const quantity = positiveQuantity(input?.quantity);
  return prismaClient.$transaction(async (transaction) => {
    const allocation = await allocationWithFulfillment(transaction, allocationId);
    if (allocation.fulfillment?.status === "CANCELLED") {
      throw serviceError("Cancelled allocation cannot be fulfilled", 409);
    }

    const fulfilled = numberValue(allocation.fulfillment?.fulfilledQuantity || 0);
    const allocated = numberValue(allocation.allocatedQuantity);
    if (fulfilled + quantity > allocated) {
      throw serviceError("Fulfillment exceeds allocated quantity", 409);
    }

    const stock = await transaction.warehouseStock.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId: allocation.warehouseId,
          productId: allocation.orderItem.productId,
        },
      },
      select: { id: true, availableQuantity: true },
    });
    if (!stock) throw serviceError("Warehouse stock not found", 404);
    if (quantity > numberValue(stock.availableQuantity)) {
      throw serviceError("Fulfillment exceeds available inventory", 409);
    }

    const deducted = await transaction.warehouseStock.updateMany({
      where: { id: stock.id, availableQuantity: { gte: quantity } },
      data: { availableQuantity: { decrement: quantity } },
    });
    if (deducted.count !== 1) {
      throw serviceError("Available inventory changed; fulfillment was not confirmed", 409);
    }

    const nextQuantity = fulfilled + quantity;
    const status = nextQuantity === allocated ? "FULFILLED" : "PARTIALLY_FULFILLED";
    const saved = await transaction.fulfillment.upsert({
      where: { allocationId },
      create: { allocationId, fulfilledQuantity: quantity, status },
      update: { fulfilledQuantity: nextQuantity, status },
      select: FULFILLMENT_SELECT,
    });
    await syncBackorderForOrderItem(transaction, allocation.orderItemId);
    return serialize(saved);
  });
};

export const getAllocationFulfillment = async (prismaClient, allocationId) => {
  const allocation = await allocationWithFulfillment(prismaClient, allocationId);
  return {
    allocation: {
      id: allocation.id,
      orderItemId: allocation.orderItemId,
      warehouseId: allocation.warehouseId,
      allocatedQuantity: allocation.allocatedQuantity.toString(),
      warehouse: allocation.warehouse,
      orderItem: allocation.orderItem,
    },
    fulfillment: allocation.fulfillment
      ? {
          ...allocation.fulfillment,
          fulfilledQuantity: allocation.fulfillment.fulfilledQuantity.toString(),
        }
      : null,
  };
};

export const getOrderItemFulfillment = async (prismaClient, orderItemId) => {
  const items = await prismaClient.orderItem.findMany({
    where: { id: orderItemId },
    select: {
      id: true,
      orderId: true,
      productId: true,
      quantity: true,
      product: { select: { id: true, name: true, sku: true, productType: true } },
      allocations: { select: FULFILLMENT_SELECT.allocation },
    },
  });
  if (!items[0]) throw serviceError("Order item not found", 404);
  return summarizeItem(items[0]);
};

const summarizeItem = (item) => {
  const fulfilled = item.allocations.reduce(
    (total, allocation) => total + numberValue(allocation.fulfillment?.fulfilledQuantity || 0),
    0,
  );
  return {
    orderItem: item,
    requiredQuantity: item.quantity,
    fulfilledQuantity: fulfilled.toFixed(2),
    remainingQuantity: Math.max(0, numberValue(item.quantity) - fulfilled).toFixed(2),
    status: fulfilled >= numberValue(item.quantity) ? "FULFILLED" : fulfilled > 0 ? "PARTIALLY_FULFILLED" : "ALLOCATED",
    allocations: item.allocations,
  };
};

export const getOrderFulfillment = async (prismaClient, orderId) => {
  const order = await prismaClient.order.findUnique({ where: { id: orderId }, select: { id: true, orderNumber: true } });
  if (!order) throw serviceError("Order not found", 404);
  const items = await prismaClient.orderItem.findMany({
    where: { orderId },
    select: {
      id: true,
      orderId: true,
      productId: true,
      quantity: true,
      product: { select: { id: true, name: true, sku: true, productType: true } },
      allocations: { select: FULFILLMENT_SELECT.allocation },
    },
    orderBy: { id: "asc" },
  });
  const summaries = items.map(summarizeItem);
  return { order, items: summaries };
};

export const getFulfillmentRecords = async (prismaClient, orderId) => {
  const records = await prismaClient.fulfillment.findMany({
    where: orderId ? { allocation: { orderItem: { orderId } } } : undefined,
    select: FULFILLMENT_SELECT,
    orderBy: { createdAt: "asc" },
  });
  return records.map(serialize);
};

export { INTERNAL_ROLES };