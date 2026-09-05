const INTERNAL_ROLES = ["ADMIN", "SALES", "MANAGER", "FINANCE", "OPERATIONS"];

const serviceError = (message, statusCode) =>
  Object.assign(new Error(message), { statusCode });

const WAREHOUSE_FIELDS = {
  id: true,
  name: true,
  code: true,
  location: true,
  active: true,
  createdAt: true,
  updatedAt: true,
};

const STOCK_FIELDS = {
  id: true,
  warehouseId: true,
  productId: true,
  availableQuantity: true,
  createdAt: true,
  updatedAt: true,
  warehouse: { select: { id: true, name: true, code: true, location: true } },
  product: { select: { id: true, name: true, sku: true, productType: true } },
};

const normalizeString = (value, field) => {
  if (typeof value !== "string" || !value.trim()) {
    throw serviceError(`${field} is required`, 400);
  }
  return value.trim();
};

const normalizeOptionalString = (value, field) => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") {
    throw serviceError(`${field} must be a string`, 400);
  }
  return value.trim() || null;
};

const normalizeQuantity = (value, field = "quantity", { allowZero = false } = {}) => {
  if (typeof value !== "string" && typeof value !== "number") {
    throw serviceError(`${field} must be numeric`, 400);
  }
  const normalized = String(value).trim();
  if (
    !/^\d+(\.\d{1,2})?$/.test(normalized) ||
    !Number.isFinite(Number(normalized)) ||
    Number(normalized) < 0 || (!allowZero && Number(normalized) === 0)
  ) {
    throw serviceError(
      `${field} must be ${allowZero ? "non-negative" : "greater than zero"} with up to two decimals`,
      400,
    );
  }
  return normalized;
};

const serializeStock = (stock) => ({
  ...stock,
  availableQuantity: stock.availableQuantity.toString(),
});

const mapDatabaseError = (error) => {
  if (error?.code === "P2002") {
    throw serviceError(
      "Warehouse code or product warehouse stock already exists",
      409,
    );
  }
  if (error?.code === "P2025") {
    throw serviceError("Warehouse or product not found", 404);
  }
  throw error;
};

export const createWarehouse = async (prismaClient, input) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw serviceError("Warehouse data must be an object", 400);
  }
  const data = {
    name: normalizeString(input.name, "name"),
    code: normalizeString(input.code, "code").toUpperCase(),
    location: normalizeOptionalString(input.location, "location"),
  };

  try {
    return await prismaClient.warehouse.create({
      data,
      select: WAREHOUSE_FIELDS,
    });
  } catch (error) {
    throw mapDatabaseError(error);
  }
};

export const listWarehouses = async (prismaClient) =>
  prismaClient.warehouse.findMany({
    select: WAREHOUSE_FIELDS,
    orderBy: { name: "asc" },
  });

export const getWarehouse = async (prismaClient, id) => {
  const warehouse = await prismaClient.warehouse.findUnique({
    where: { id },
    select: WAREHOUSE_FIELDS,
  });
  if (!warehouse) throw serviceError("Warehouse not found", 404);
  return warehouse;
};

export const listInventory = async (prismaClient) => {
  const stock = await prismaClient.warehouseStock.findMany({
    select: STOCK_FIELDS,
    orderBy: [{ warehouse: { name: "asc" } }, { product: { name: "asc" } }],
  });
  return stock.map(serializeStock);
};

export const getProductStock = async (prismaClient, productId) => {
  const product = await prismaClient.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) throw serviceError("Product not found", 404);

  const stock = await prismaClient.warehouseStock.findMany({
    where: { productId },
    select: STOCK_FIELDS,
    orderBy: { warehouse: { name: "asc" } },
  });
  const serialized = stock.map(serializeStock);
  const totalAvailable = serialized.reduce(
    (total, item) => total + Number(item.availableQuantity),
    0,
  );

  return {
    productId,
    totalAvailable: totalAvailable.toFixed(2),
    warehouses: serialized,
  };
};

export const receiveStock = async (
  prismaClient,
  { warehouseId, productId, quantity },
) => {
  const normalizedQuantity = normalizeQuantity(quantity);
  if (typeof warehouseId !== "string" || !warehouseId.trim()) {
    throw serviceError("warehouseId is required", 400);
  }
  if (typeof productId !== "string" || !productId.trim()) {
    throw serviceError("productId is required", 400);
  }

  try {
    return await prismaClient.$transaction(async (transaction) => {
      const [warehouse, product] = await Promise.all([
        transaction.warehouse.findUnique({
          where: { id: warehouseId },
          select: { id: true },
        }),
        transaction.product.findUnique({
          where: { id: productId },
          select: { id: true },
        }),
      ]);
      if (!warehouse) throw serviceError("Warehouse not found", 404);
      if (!product) throw serviceError("Product not found", 404);

      const stock = await transaction.warehouseStock.upsert({
        where: { warehouseId_productId: { warehouseId, productId } },
        create: {
          warehouseId,
          productId,
          availableQuantity: normalizedQuantity,
        },
        update: { availableQuantity: { increment: normalizedQuantity } },
        select: STOCK_FIELDS,
      });
      return serializeStock(stock);
    });
  } catch (error) {
    throw mapDatabaseError(error);
  }
};

export const updateStock = async (
  prismaClient,
  { warehouseId, productId, quantity },
) => {
  const normalizedQuantity = normalizeQuantity(quantity, "quantity", {
    allowZero: true,
  });
  if (typeof warehouseId !== "string" || !warehouseId.trim()) {
    throw serviceError("warehouseId is required", 400);
  }
  if (typeof productId !== "string" || !productId.trim()) {
    throw serviceError("productId is required", 400);
  }

  try {
    return await prismaClient.$transaction(async (transaction) => {
      const [warehouse, product] = await Promise.all([
        transaction.warehouse.findUnique({
          where: { id: warehouseId },
          select: { id: true },
        }),
        transaction.product.findUnique({
          where: { id: productId },
          select: { id: true },
        }),
      ]);
      if (!warehouse) throw serviceError("Warehouse not found", 404);
      if (!product) throw serviceError("Product not found", 404);

      const stock = await transaction.warehouseStock.upsert({
        where: { warehouseId_productId: { warehouseId, productId } },
        create: {
          warehouseId,
          productId,
          availableQuantity: normalizedQuantity,
        },
        update: { availableQuantity: normalizedQuantity },
        select: STOCK_FIELDS,
      });
      return serializeStock(stock);
    });
  } catch (error) {
    throw mapDatabaseError(error);
  }
};

export { INTERNAL_ROLES };