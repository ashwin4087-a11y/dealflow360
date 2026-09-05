<<<<<<< HEAD
/**
 * Product Service
 * Queries the Product table through Prisma.
 */

export const listProducts = async (prisma) => {
  return prisma.product.findMany({
    orderBy: { name: "asc" },
  });
};

export const getProduct = async (prisma, id) => {
  const product = await prisma.product.findUnique({ where: { id } });

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  return product;
=======
const PRODUCT_FIELDS = {
  id: true,
  name: true,
  sku: true,
  description: true,
  category: true,
  productType: true,
  basePrice: true,
  active: true,
  createdAt: true,
  updatedAt: true,
};

const PRODUCT_TYPES = new Set(["ONE_TIME", "RECURRING"]);
const PRODUCT_INPUT_FIELDS = [
  "name",
  "sku",
  "description",
  "category",
  "productType",
  "basePrice",
  "active",
];
const serviceError = (message, statusCode) =>
  Object.assign(new Error(message), { statusCode });

const toPublicProduct = (product) => ({
  ...Object.fromEntries(
    Object.keys(PRODUCT_FIELDS)
      .filter((field) => field in product)
      .map((field) => [field, product[field]]),
  ),
  ...(product.basePrice !== undefined
    ? { basePrice: product.basePrice.toString() }
    : {}),
});

const normalizeString = (value, field, { required = false } = {}) => {
  if (typeof value !== "string")
    throw serviceError(`${field} must be a string`, 400);
  const normalized = value.trim();
  if (required && !normalized) throw serviceError(`${field} is required`, 400);
  return normalized;
};

const normalizePrice = (value) => {
  if (typeof value !== "string" && typeof value !== "number")
    throw serviceError("basePrice must be numeric", 400);
  const normalized = String(value).trim();
  if (
    !/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(normalized) ||
    !Number.isFinite(Number(normalized))
  ) {
    throw serviceError(
      "basePrice must be a finite non-negative amount with up to two decimals",
      400,
    );
  }
  return normalized;
};

const buildProductData = (input, { partial = false } = {}) => {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw serviceError("Product data must be an object", 400);
  if (Object.keys(input).some((field) => !PRODUCT_INPUT_FIELDS.includes(field)))
    throw serviceError("Product contains unsupported fields", 400);

  const data = {};
  if (!partial || "name" in input)
    data.name = normalizeString(input.name, "name", { required: true });
  if (!partial || "sku" in input)
    data.sku = normalizeString(input.sku, "sku", { required: true });
  if (!partial || "description" in input)
    data.description =
      input.description == null
        ? null
        : normalizeString(input.description, "description");
  if (!partial || "category" in input)
    data.category = normalizeString(input.category, "category", {
      required: true,
    });
  if (!partial || "productType" in input) {
    data.productType = normalizeString(input.productType, "productType", {
      required: true,
    }).toUpperCase();
    if (!PRODUCT_TYPES.has(data.productType))
      throw serviceError("productType must be ONE_TIME or RECURRING", 400);
  }
  if (!partial || "basePrice" in input)
    data.basePrice = normalizePrice(input.basePrice);
  if ("active" in input) {
    if (typeof input.active !== "boolean")
      throw serviceError("active must be boolean", 400);
    data.active = input.active;
  }
  return data;
};

const notFoundError = () => serviceError("Product not found", 404);
const mapDatabaseError = (error) => {
  if (error?.code === "P2002")
    throw serviceError("Product SKU already exists", 409);
  throw error;
};

export const listProducts = async (prismaClient) => {
  const products = await prismaClient.product.findMany({
    select: PRODUCT_FIELDS,
    orderBy: { name: "asc" },
  });
  return products.map(toPublicProduct);
};

export const createProduct = async (prismaClient, input) => {
  try {
    const product = await prismaClient.product.create({
      data: buildProductData(input),
      select: PRODUCT_FIELDS,
    });
    return toPublicProduct(product);
  } catch (error) {
    throw mapDatabaseError(error);
  }
};

export const getProduct = async (prismaClient, id) => {
  const product = await prismaClient.product.findUnique({
    where: { id },
    select: PRODUCT_FIELDS,
  });
  if (!product) throw notFoundError();
  return toPublicProduct(product);
};

export const updateProduct = async (prismaClient, id, input) => {
  const data = buildProductData(input, { partial: true });
  if (!Object.keys(data).length)
    throw serviceError("At least one product field is required", 400);
  try {
    const product = await prismaClient.product.update({
      where: { id },
      data,
      select: PRODUCT_FIELDS,
    });
    if (!product) throw notFoundError();
    return toPublicProduct(product);
  } catch (error) {
    if (error?.code === "P2025") throw notFoundError();
    throw mapDatabaseError(error);
  }
>>>>>>> ae6d6e7f00f8e851438f6837c024c7a9822cb5d3
};
