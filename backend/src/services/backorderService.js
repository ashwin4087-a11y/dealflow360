const INTERNAL_ROLES = ["ADMIN", "SALES", "MANAGER", "FINANCE", "OPERATIONS"];
const OPEN_STATUSES = ["BACKORDERED", "READY_TO_FULFILL"];

const serviceError = (message, statusCode) =>
  Object.assign(new Error(message), { statusCode });

const BACKORDER_SELECT = {
  id: true,
  orderId: true,
  orderItemId: true,
  productId: true,
  requiredQuantity: true,
  fulfilledQuantity: true,
  remainingQuantity: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  order: { select: { id: true, orderNumber: true } },
  orderItem: { select: { id: true, orderId: true, productId: true, quantity: true } },
  product: { select: { id: true, name: true, sku: true, productType: true } },
};

const positiveQuantity = (value, field = "quantity") => {
  if (typeof value !== "string" && typeof value !== "number") {
    throw serviceError(`${field} must be numeric`, 400);
  }
  const normalized = String(value).trim();
  const parsed = Number(normalized);
  if (!/^\d+(\.\d{1,2})?$/.test(normalized) || !Number.isFinite(parsed) || parsed <= 0) {
    throw serviceError(`${field} must be greater than zero with up to two decimals`, 400);
  }
  return parsed;
};

const numberValue = (value) => Number(value);
const serialize = (backorder) => ({
  ...backorder,
  requiredQuantity: backorder.requiredQuantity.toString(),
  fulfilledQuantity: backorder.fulfilledQuantity.toString(),
  remainingQuantity: backorder.remainingQuantity.toString(),
});

const getItemWithFulfillment = async (transaction, orderItemId) => {
  const item = await transaction.orderItem.findUnique({
    where: { id: orderItemId },
    select: {
      id: true,
      orderId: true,
      productId: true,
      quantity: true,
      allocations: { select: { fulfillment: { select: { fulfilledQuantity: true } } } },
    },
  });
  if (!item) throw serviceError("Order item not found", 404);
  return item;
};

const fulfilledOrderItemQuantity = (item) =>
  item.allocations.reduce(
    (total, allocation) => total + numberValue(allocation.fulfillment?.fulfilledQuantity || 0),
    0,
  );

export const syncBackorderForOrderItem = async (transaction, orderItemId) => {
  if (!transaction.backorder) return null;
  const item = await getItemWithFulfillment(transaction, orderItemId);
  const required = numberValue(item.quantity);
  const fulfilled = fulfilledOrderItemQuantity(item);
  const shortage = Math.max(0, required - fulfilled);
  const existing = await transaction.backorder.findFirst({
    where: { orderItemId, status: { in: OPEN_STATUSES } },
    orderBy: { createdAt: "asc" },
    select: { id: true, requiredQuantity: true, fulfilledQuantity: true, remainingQuantity: true },
  });

  if (shortage <= 0) return null;
  if (existing) {
    return transaction.backorder.update({
      where: { id: existing.id },
      data: { remainingQuantity: shortage, status: "BACKORDERED" },
      select: BACKORDER_SELECT,
    });
  }

  return transaction.backorder.create({
    data: {
      orderId: item.orderId,
      orderItemId: item.id,
      productId: item.productId,
      requiredQuantity: shortage.toFixed(2),
      fulfilledQuantity: "0.00",
      remainingQuantity: shortage.toFixed(2),
      status: "BACKORDERED",
    },
    select: BACKORDER_SELECT,
  });
};

const applyStockToBackorder = async (transaction, backorder, warehouseId, requestedQuantity) => {
  const stock = await transaction.warehouseStock.findUnique({
    where: { warehouseId_productId: { warehouseId, productId: backorder.productId } },
    select: { id: true, availableQuantity: true },
  });
  if (!stock) throw serviceError("Warehouse stock not found", 404);
  const remaining = numberValue(backorder.remainingQuantity);
  const available = numberValue(stock.availableQuantity);
  const quantity = Math.min(requestedQuantity, remaining, available);
  if (quantity <= 0) throw serviceError("No available stock for this backorder", 409);

  const deducted = await transaction.warehouseStock.updateMany({
    where: { id: stock.id, availableQuantity: { gte: quantity } },
    data: { availableQuantity: { decrement: quantity } },
  });
  if (deducted.count !== 1) throw serviceError("Available inventory changed; backorder was not fulfilled", 409);

  const nextRemaining = remaining - quantity;
  return transaction.backorder.update({
    where: { id: backorder.id },
    data: {
      fulfilledQuantity: { increment: quantity },
      remainingQuantity: nextRemaining.toFixed(2),
      status: nextRemaining === 0 ? "FULFILLED" : "READY_TO_FULFILL",
    },
    select: BACKORDER_SELECT,
  });
};

export const fulfillBackorder = async (prismaClient, backorderId, input) => {
  const quantity = positiveQuantity(input?.quantity);
  const warehouseId = input?.warehouseId;
  if (typeof warehouseId !== "string" || !warehouseId.trim()) {
    throw serviceError("warehouseId is required", 400);
  }
  return prismaClient.$transaction(async (transaction) => {
    const backorder = await transaction.backorder.findUnique({
      where: { id: backorderId },
      select: BACKORDER_SELECT,
    });
    if (!backorder) throw serviceError("Backorder not found", 404);
    if (!OPEN_STATUSES.includes(backorder.status)) {
      throw serviceError("Backorder is not eligible for fulfillment", 409);
    }
    if (quantity > numberValue(backorder.remainingQuantity)) {
      throw serviceError("Fulfillment exceeds remaining backorder quantity", 409);
    }
    const warehouse = await transaction.warehouse.findUnique({ where: { id: warehouseId }, select: { id: true } });
    if (!warehouse) throw serviceError("Warehouse not found", 404);
    return serialize(await applyStockToBackorder(transaction, backorder, warehouseId, quantity));
  });
};

export const fulfillEligibleBackorders = async (transaction, warehouseId, productId) => {
  if (!transaction.backorder) return [];
  const open = await transaction.backorder.findMany({
    where: { productId, status: { in: OPEN_STATUSES } },
    orderBy: { createdAt: "asc" },
    select: BACKORDER_SELECT,
  });
  const results = [];
  for (const backorder of open) {
    const stock = await transaction.warehouseStock.findUnique({
      where: { warehouseId_productId: { warehouseId, productId } },
      select: { availableQuantity: true },
    });
    if (!stock || numberValue(stock.availableQuantity) <= 0) break;
    results.push(await applyStockToBackorder(transaction, backorder, warehouseId, numberValue(stock.availableQuantity)));
  }
  return results.map(serialize);
};

export const getBackordersForOrder = async (prismaClient, orderId) => {
  const order = await prismaClient.order.findUnique({ where: { id: orderId }, select: { id: true, orderNumber: true } });
  if (!order) throw serviceError("Order not found", 404);
  const data = await prismaClient.backorder.findMany({ where: { orderId }, select: BACKORDER_SELECT, orderBy: { createdAt: "asc" } });
  return { order, backorders: data.map(serialize) };
};

export const getBackorder = async (prismaClient, id) => {
  const data = await prismaClient.backorder.findUnique({ where: { id }, select: BACKORDER_SELECT });
  if (!data) throw serviceError("Backorder not found", 404);
  return serialize(data);
};

export const getBackordersForOrderItem = async (prismaClient, orderItemId) => {
  const item = await prismaClient.orderItem.findUnique({ where: { id: orderItemId }, select: { id: true, orderId: true, productId: true, quantity: true } });
  if (!item) throw serviceError("Order item not found", 404);
  const data = await prismaClient.backorder.findMany({ where: { orderItemId }, select: BACKORDER_SELECT, orderBy: { createdAt: "asc" } });
  return { orderItem: item, backorders: data.map(serialize) };
};

export const getEligibleBackorders = async (prismaClient, productId, warehouseId) => {
  const data = await prismaClient.backorder.findMany({
    where: { productId, status: { in: OPEN_STATUSES } },
    select: BACKORDER_SELECT,
    orderBy: { createdAt: "asc" },
  });
  return data.map(serialize);
};

export const cancelBackorder = async (prismaClient, id) => {
  const data = await prismaClient.backorder.updateMany({
    where: { id, status: { in: OPEN_STATUSES } },
    data: { status: "CANCELLED" },
  });
  if (data.count !== 1) throw serviceError("Backorder not found or not cancellable", 409);
  return getBackorder(prismaClient, id);
};

export { INTERNAL_ROLES };
