import { getProductPrice } from "./pricingService.js";

const QUOTATION_FIELDS = {
  id: true,
  quotationNumber: true,
  status: true,
  subtotal: true,
  discountPercent: true,
  discountAmount: true,
  taxPercent: true,
  taxAmount: true,
  total: true,
  marginAmount: true,
  createdAt: true,
  updatedAt: true,
  customer: {
    select: {
      id: true,
      name: true,
      email: true,
      company: true,
      customerTier: true,
    },
  },
  salesperson: {
    select: { id: true, name: true, email: true, role: true },
  },
  items: {
    select: {
      id: true,
      productId: true,
      quantity: true,
      unitPrice: true,
      discountPercent: true,
      discountAmount: true,
      lineTotal: true,
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          category: true,
          productType: true,
        },
      },
    },
  },
};

const INPUT_FIELDS = ["customerId", "items", "taxPercent"];
const serviceError = (message, statusCode) =>
  Object.assign(new Error(message), { statusCode });

const decimalString = (value) => String(value);
const decimalPlaces = (value) => {
  const normalized = String(value);
  return normalized.includes(".") ? normalized.split(".")[1].length : 0;
};

const parseDecimal = (
  value,
  field,
  { positive = false, maxPlaces = 2 } = {},
) => {
  if (typeof value !== "string" && typeof value !== "number")
    throw serviceError(`${field} must be numeric`, 400);
  const normalized = String(value).trim();
  if (!/^\d+(\.\d+)?$/.test(normalized) || !Number.isFinite(Number(normalized)))
    throw serviceError(`${field} must be finite and numeric`, 400);
  if (decimalPlaces(normalized) > maxPlaces)
    throw serviceError(`${field} has too many decimal places`, 400);
  const number = Number(normalized);
  if (positive ? number <= 0 : number < 0)
    throw serviceError(
      `${field} must be ${positive ? "greater than zero" : "non-negative"}`,
      400,
    );
  return normalized;
};

const toCents = (value) => {
  const [whole, fraction = ""] = String(value).split(".");
  return BigInt(whole) * 100n + BigInt((fraction + "00").slice(0, 2));
};

const centsToString = (cents) => {
  const sign = cents < 0n ? "-" : "";
  const absolute = cents < 0n ? -cents : cents;
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
};

const multiplyMoney = (quantity, unitPrice) => {
  const quantityScaled = BigInt(
    String(quantity).replace(".", "").replace(/^0+/, "") || "0",
  );
  const quantityPlaces = decimalPlaces(quantity);
  const priceCents = toCents(unitPrice);
  const numerator = quantityScaled * priceCents;
  const denominator = 10n ** BigInt(quantityPlaces);
  return (numerator + denominator / 2n) / denominator;
};

const normalizeInput = (input, { partial = false } = {}) => {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw serviceError("Quotation data must be an object", 400);
  if (Object.keys(input).some((field) => !INPUT_FIELDS.includes(field)))
    throw serviceError("Quotation contains unsupported fields", 400);
  if (
    (!partial && typeof input.customerId !== "string") ||
    (!partial && !input.customerId.trim())
  )
    throw serviceError("customerId is required", 400);
  if (
    (!partial && !Array.isArray(input.items)) ||
    (partial && input.items !== undefined && !Array.isArray(input.items))
  )
    throw serviceError("items must be a non-empty array", 400);
  if (!partial && input.items.length === 0)
    throw serviceError("items must be a non-empty array", 400);
  if (input.taxPercent !== undefined)
    parseDecimal(input.taxPercent, "taxPercent");
  if (input.items !== undefined) {
    input.items.forEach((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item))
        throw serviceError("Each quotation item must be an object", 400);
      if (
        Object.keys(item).some(
          (field) => !["productId", "quantity"].includes(field),
        )
      )
        throw serviceError("Quotation item contains unsupported fields", 400);
      if (typeof item.productId !== "string" || !item.productId.trim())
        throw serviceError("productId is required", 400);
      parseDecimal(item.quantity, "quantity", { positive: true });
    });
  }
  return {
    customerId: input.customerId,
    items: input.items,
    taxPercent:
      input.taxPercent === undefined
        ? "0"
        : parseDecimal(input.taxPercent, "taxPercent"),
  };
};

const serializeQuotation = (quotation) => {
  const monetaryFields = [
    "subtotal",
    "discountAmount",
    "taxAmount",
    "total",
    "marginAmount",
  ];
  const serialized = Object.fromEntries(
    [
      "id",
      "quotationNumber",
      "status",
      "subtotal",
      "discountPercent",
      "discountAmount",
      "taxPercent",
      "taxAmount",
      "total",
      "marginAmount",
      "createdAt",
      "updatedAt",
    ]
      .filter((field) => field in quotation)
      .map((field) => [field, quotation[field]]),
  );
  if (quotation.customer) {
    serialized.customer = Object.fromEntries(
      ["id", "name", "email", "company", "customerTier"]
        .filter((field) => field in quotation.customer)
        .map((field) => [field, quotation.customer[field]]),
    );
  }
  if (quotation.salesperson) {
    serialized.salesperson = Object.fromEntries(
      ["id", "name", "email", "role"]
        .filter((field) => field in quotation.salesperson)
        .map((field) => [field, quotation.salesperson[field]]),
    );
  }
  for (const field of monetaryFields)
    if (serialized[field] !== undefined)
      serialized[field] = decimalString(serialized[field]);
  if (serialized.taxPercent !== undefined)
    serialized.taxPercent = decimalString(serialized.taxPercent);
  if (serialized.discountPercent !== undefined)
    serialized.discountPercent = decimalString(serialized.discountPercent);
  if (quotation.items)
    serialized.items = quotation.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: decimalString(item.quantity),
      unitPrice: decimalString(item.unitPrice),
      discountPercent: decimalString(item.discountPercent),
      discountAmount: decimalString(item.discountAmount),
      lineTotal: decimalString(item.lineTotal),
      ...(item.product
        ? {
            product: Object.fromEntries(
              ["id", "name", "sku", "category", "productType"]
                .filter((field) => field in item.product)
                .map((field) => [field, item.product[field]]),
            ),
          }
        : {}),
    }));
  return serialized;
};

const calculateQuote = async (prismaClient, input) => {
  const normalized = normalizeInput(input);
  const customer = await prismaClient.customer.findUnique({
    where: { id: normalized.customerId },
    select: { id: true },
  });
  if (!customer) throw serviceError("Customer not found", 404);

  const items = [];
  let subtotalCents = 0n;
  for (const item of normalized.items) {
    const unitPrice = await getProductPrice(prismaClient, item.productId);
    const lineTotal = multiplyMoney(item.quantity, unitPrice);
    subtotalCents += lineTotal;
    items.push({
      productId: item.productId,
      quantity: parseDecimal(item.quantity, "quantity", { positive: true }),
      unitPrice: decimalString(unitPrice),
      discountPercent: "0",
      discountAmount: "0.00",
      lineTotal: centsToString(lineTotal),
    });
  }

  const taxPercent = normalized.taxPercent || "0";
  const taxBasis = subtotalCents * BigInt(taxPercent.replace(".", ""));
  const taxScale = 10n ** BigInt(decimalPlaces(taxPercent));
  const taxCents = (taxBasis + taxScale * 50n) / (taxScale * 100n);
  return {
    normalized,
    items,
    subtotal: centsToString(subtotalCents),
    taxPercent,
    taxAmount: centsToString(taxCents),
    total: centsToString(subtotalCents + taxCents),
  };
};

const quotationNumber = () =>
  `Q-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export const createQuotation = async (prismaClient, salespersonId, input) => {
  const calculated = await calculateQuote(prismaClient, input);
  return prismaClient.$transaction(async (transaction) => {
    const quotation = await transaction.quotation.create({
      data: {
        quotationNumber: quotationNumber(),
        customerId: calculated.normalized.customerId,
        salespersonId,
        status: "DRAFT",
        subtotal: calculated.subtotal,
        discountPercent: "0",
        discountAmount: "0.00",
        taxPercent: calculated.taxPercent,
        taxAmount: calculated.taxAmount,
        total: calculated.total,
        marginAmount: "0.00",
        items: { create: calculated.items },
      },
      select: QUOTATION_FIELDS,
    });
    return serializeQuotation(quotation);
  });
};

export const listQuotations = async (prismaClient) => {
  const quotations = await prismaClient.quotation.findMany({
    select: QUOTATION_FIELDS,
    orderBy: { createdAt: "desc" },
  });
  return quotations.map(serializeQuotation);
};

export const getQuotation = async (prismaClient, id) => {
  const quotation = await prismaClient.quotation.findUnique({
    where: { id },
    select: QUOTATION_FIELDS,
  });
  if (!quotation) throw serviceError("Quotation not found", 404);
  return serializeQuotation(quotation);
};

export const updateQuotation = async (prismaClient, id, input) => {
  const existing = await prismaClient.quotation.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!existing) throw serviceError("Quotation not found", 404);
  if (existing.status !== "DRAFT")
    throw serviceError("Only DRAFT quotations can be updated", 409);
  const calculated = await calculateQuote(prismaClient, input);

  return prismaClient.$transaction(async (transaction) => {
    await transaction.quotationItem.deleteMany({ where: { quotationId: id } });
    await transaction.quotation.update({
      where: { id },
      data: {
        customerId: calculated.normalized.customerId,
        subtotal: calculated.subtotal,
        discountPercent: "0",
        discountAmount: "0.00",
        taxPercent: calculated.taxPercent,
        taxAmount: calculated.taxAmount,
        total: calculated.total,
        marginAmount: "0.00",
        items: { create: calculated.items },
      },
    });
    const quotation = await transaction.quotation.findUnique({
      where: { id },
      select: QUOTATION_FIELDS,
    });
    return serializeQuotation(quotation);
  });
};
