const INTERNAL_ROLES = ["ADMIN", "SALES", "SALESPERSON", "MANAGER", "FINANCE", "OPERATIONS"];

const serviceError = (message, statusCode) =>
  Object.assign(new Error(message), { statusCode });

const ALLOCATION_FIELDS = {
  id: true,
  orderItemId: true,
  warehouseId: true,
  allocatedQuantity: true,
  createdAt: true,
  updatedAt: true,
  warehouse: { select: { id: true, name: true, code: true, location: true } },
};

const ITEM_FIELDS = {
  id: true,
  orderId: true,
  productId: true,
  quantity: true,
  product: { select: { id: true, name: true, sku: true, productType: true } },
};

const quantityNumber = (value, field, { allowZero = false } = {}) => {
  if (typeof value !== "string" && typeof value !== "number") {
    throw serviceError(`${field} must be numeric`, 400);
  }
  const normalized = String(value).trim();
  const parsed = Number(normalized);
  if (
    !/^\d+(\.\d{1,2})?$/.test(normalized) ||
    !Number.isFinite(parsed) ||
    parsed < 0 ||
    (!allowZero && parsed === 0)
  ) {
    throw serviceError(
      `${field} must be ${allowZero ? "non-negative" : "greater than zero"} with up to two decimals`,
      400,
    );
  }
  return parsed;
};

const decimalValue = (value) => Number(value);

const serializeAllocation = (allocation) => ({
  ...allocation,
  allocatedQuantity: allocation.allocatedQuantity.toString(),
});

const getOrderItem = async (prismaClient, orderItemId) => {
  const item = await prismaClient.orderItem.findUnique({
    where: { id: orderItemId },
    select: ITEM_FIELDS,
  });
  if (!item) throw serviceError("Order item not found", 404);
  return item;
};

const getInventoryForItem = async (prismaClient, item, warehouseIds) => {
  const stock = await prismaClient.warehouseStock.findMany({
    where: {
      productId: item.productId,
      ...(warehouseIds ? { warehouseId: { in: warehouseIds } } : {}),
    },
    select: {
      warehouseId: true,
      availableQuantity: true,
      warehouse: { select: { id: true, name: true, code: true, location: true } },
    },
    orderBy: { warehouse: { name: "asc" } },
  });
  return stock;
};

export const recommendAllocation = async (prismaClient, orderItemId) => {
  const item = await getOrderItem(prismaClient, orderItemId);
  const requiredQuantity = quantityNumber(item.quantity, "order item quantity", {
    allowZero: true,
  });
  const stock = await getInventoryForItem(prismaClient, item);
  let remaining = requiredQuantity;
  const recommendations = [];

  for (const row of stock) {
    const available = decimalValue(row.availableQuantity);
    const quantity = Math.min(remaining, available);
    if (quantity <= 0) continue;
    recommendations.push({
      warehouseId: row.warehouseId,
      warehouse: row.warehouse,
      allocatedQuantity: quantity.toFixed(2),
    });
    remaining -= quantity;
  }

  return {
    orderItem: item,
    requiredQuantity,
    totalRecommended: (requiredQuantity - remaining).toFixed(2),
    remainingQuantity: remaining.toFixed(2),
    allocations: recommendations,
  };
};

const normalizeAllocations = (input) => {
  if (!Array.isArray(input) || input.length === 0) {
    throw serviceError("allocations must be a non-empty array", 400);
  }
  const seen = new Set();
  return input.map((allocation) => {
    if (!allocation || typeof allocation !== "object") {
      throw serviceError("Each allocation must be an object", 400);
    }
    if (typeof allocation.warehouseId !== "string" || !allocation.warehouseId.trim()) {
      throw serviceError("warehouseId is required", 400);
    }
    const warehouseId = allocation.warehouseId.trim();
    if (seen.has(warehouseId)) {
      throw serviceError("Duplicate warehouse allocations are not allowed", 409);
    }
    seen.add(warehouseId);
    return {
      warehouseId,
      quantity: quantityNumber(allocation.quantity, "allocation quantity"),
    };
  });
};

const validateAllocations = async (transaction, item, allocations) => {
  const requiredQuantity = quantityNumber(item.quantity, "order item quantity", {
    allowZero: true,
  });
  const total = allocations.reduce((sum, allocation) => sum + allocation.quantity, 0);
  if (total > requiredQuantity) {
    throw serviceError("Total allocation exceeds required order item quantity", 409);
  }

  const warehouses = await transaction.warehouse.findMany({
    where: { id: { in: allocations.map(({ warehouseId }) => warehouseId) } },
    select: { id: true },
  });
  if (warehouses.length !== allocations.length) {
    throw serviceError("One or more warehouses were not found", 404);
  }

  const stock = await getInventoryForItem(
    transaction,
    item,
    allocations.map(({ warehouseId }) => warehouseId),
  );
  const stockByWarehouse = new Map(stock.map((row) => [row.warehouseId, row]));
  for (const allocation of allocations) {
    const row = stockByWarehouse.get(allocation.warehouseId);
    if (!row) throw serviceError("Product has no stock record in warehouse", 409);
    if (allocation.quantity > decimalValue(row.availableQuantity)) {
      throw serviceError("Allocation exceeds available warehouse stock", 409);
    }
  }
  return { requiredQuantity, total };
};

export const replaceAllocation = async (prismaClient, orderItemId, input) => {
  const allocations = normalizeAllocations(input?.allocations);
  return prismaClient.$transaction(async (transaction) => {
    const item = await transaction.orderItem.findUnique({
      where: { id: orderItemId },
      select: ITEM_FIELDS,
    });
    if (!item) throw serviceError("Order item not found", 404);
    await validateAllocations(transaction, item, allocations);
    await transaction.allocation.deleteMany({ where: { orderItemId } });
    const created = await Promise.all(
      allocations.map((allocation) =>
        transaction.allocation.create({
          data: {
            orderItemId,
            warehouseId: allocation.warehouseId,
            allocatedQuantity: allocation.quantity.toFixed(2),
          },
          select: ALLOCATION_FIELDS,
        }),
      ),
    );
    return created.map(serializeAllocation);
  });
};

export const getOrderAllocations = async (prismaClient, orderId) => {
  const order = await prismaClient.order.findUnique({
    where: { id: orderId },
    select: { id: true, orderNumber: true },
  });
  if (!order) throw serviceError("Order not found", 404);
  const items = await prismaClient.orderItem.findMany({
    where: { orderId },
    select: {
      ...ITEM_FIELDS,
      allocations: { select: ALLOCATION_FIELDS, orderBy: { warehouse: { name: "asc" } } },
    },
    orderBy: { id: "asc" },
  });
  return {
    order,
    items: items.map((item) => ({
      ...item,
      allocations: item.allocations.map(serializeAllocation),
    })),
  };
};

export const getItemAllocations = async (prismaClient, orderItemId) => {
  const item = await getOrderItem(prismaClient, orderItemId);
  const allocations = await prismaClient.allocation.findMany({
    where: { orderItemId },
    select: ALLOCATION_FIELDS,
    orderBy: { warehouse: { name: "asc" } },
  });
  return { orderItem: item, allocations: allocations.map(serializeAllocation) };
};

export { INTERNAL_ROLES };