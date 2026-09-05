import { getProductPrice } from "./pricingService.js";
import {
  calculateDiscountAmount,
  validateDiscountPercent,
  validateLineDiscount,
} from "./discountService.js";
import { calculateBlendedDiscountRisk } from "./riskService.js";
import { createApprovalRequests, evaluateApproval } from "./approvalService.js";

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
          (field) =>
            !["productId", "quantity", "discountPercent"].includes(field),
        )
      )
        throw serviceError("Quotation item contains unsupported fields", 400);
      if (typeof item.productId !== "string" || !item.productId.trim())
        throw serviceError("productId is required", 400);
      parseDecimal(item.quantity, "quantity", { positive: true });
      if (item.discountPercent !== undefined)
        validateDiscountPercent(item.discountPercent);
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
      ...(item.maxAllowedDiscountPercent !== undefined
        ? {
            maxAllowedDiscountPercent: decimalString(
              item.maxAllowedDiscountPercent,
            ),
          }
        : {}),
      ...(item.compliant !== undefined ? { compliant: item.compliant } : {}),
      ...(item.ruleFound !== undefined ? { ruleFound: item.ruleFound } : {}),
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
  if (quotation.risk) serialized.risk = quotation.risk;
  return serialized;
};

export const calculateQuote = async (prismaClient, input) => {
  const normalized = normalizeInput(input);
  const customer = await prismaClient.customer.findUnique({
    where: { id: normalized.customerId },
    select: { id: true, customerTier: true },
  });
  if (!customer) throw serviceError("Customer not found", 404);

  const items = [];
  let subtotalCents = 0n;
  let grossSubtotalCents = 0n;
  let discountAmountCents = 0n;
  for (const item of normalized.items) {
    const product = await prismaClient.product.findUnique({
      where: { id: item.productId },
      select: { id: true, category: true },
    });
    if (!product) throw serviceError("Product not found", 404);
    const unitPrice = await getProductPrice(prismaClient, item.productId);
    const discountPercent =
      item.discountPercent === undefined
        ? "0"
        : validateDiscountPercent(item.discountPercent);
    const governance = await validateLineDiscount(prismaClient, {
      customerTier: customer.customerTier,
      productCategory: product.category,
      discountPercent,
    });
    const grossLineAmount = multiplyMoney(item.quantity, unitPrice);
    const discountAmount = calculateDiscountAmount(
      centsToString(grossLineAmount),
      discountPercent,
    );
    const lineDiscountCents = toCents(discountAmount);
    const lineTotal = grossLineAmount - lineDiscountCents;
    grossSubtotalCents += grossLineAmount;
    discountAmountCents += lineDiscountCents;
    subtotalCents += lineTotal;
    items.push({
      productId: item.productId,
      quantity: parseDecimal(item.quantity, "quantity", { positive: true }),
      unitPrice: decimalString(unitPrice),
      discountPercent,
      discountAmount,
      lineTotal: centsToString(lineTotal),
      maxAllowedDiscountPercent: governance.maxAllowedDiscountPercent,
      compliant: governance.compliant,
      ruleFound: governance.ruleFound,
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
    grossSubtotal: centsToString(grossSubtotalCents),
    discountAmount: centsToString(discountAmountCents),
    taxPercent,
    taxAmount: centsToString(taxCents),
    total: centsToString(subtotalCents + taxCents),
  };
};

const quotationNumber = () =>
  `Q-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const withRisk = (quotation, items) => ({
  ...quotation,
  items,
  risk: calculateBlendedDiscountRisk(items),
});

export const createQuotation = async (prismaClient, salespersonId, input) => {
  const calculated = await calculateQuote(prismaClient, input);
  const calculatedRisk = calculateBlendedDiscountRisk(calculated.items);
  const approvalDecision = await evaluateApproval(prismaClient, calculatedRisk);
  return prismaClient.$transaction(async (transaction) => {
    const quotation = await transaction.quotation.create({
      data: {
        quotationNumber: quotationNumber(),
        customerId: calculated.normalized.customerId,
        salespersonId,
        status: approvalDecision.approvalRequired
          ? "PENDING_APPROVAL"
          : "DRAFT",
        subtotal: calculated.subtotal,
        discountPercent: "0",
        discountAmount: calculated.discountAmount,
        taxPercent: calculated.taxPercent,
        taxAmount: calculated.taxAmount,
        total: calculated.total,
        marginAmount: "0.00",
        items: {
          create: calculated.items.map(
            ({ maxAllowedDiscountPercent, compliant, ruleFound, ...item }) =>
              item,
          ),
        },
      },
      select: QUOTATION_FIELDS,
    });
    await createApprovalRequests(
      transaction,
      quotation.id,
      salespersonId,
      approvalDecision,
      calculatedRisk,
    );
    return serializeQuotation(
      withRisk(
        quotation,
        quotation.items.map((item, index) => ({
          ...item,
          ...calculated.items[index],
        })),
      ),
    );
  });
};

export const listQuotations = async (prismaClient) => {
  const quotations = await prismaClient.quotation.findMany({
    select: QUOTATION_FIELDS,
    orderBy: { createdAt: "desc" },
  });
  return Promise.all(
    quotations.map((quotation) => decorateQuotation(prismaClient, quotation)),
  );
};

export const getQuotation = async (prismaClient, id) => {
  const quotation = await prismaClient.quotation.findUnique({
    where: { id },
    select: QUOTATION_FIELDS,
  });
  if (!quotation) throw serviceError("Quotation not found", 404);
  return decorateQuotation(prismaClient, quotation);
};

export const previewQuotation = async (prismaClient, id, input) => {
  const existing = await prismaClient.quotation.findUnique({
    where: { id },
    select: {
      customerId: true,
      subtotal: true,
      discountPercent: true,
      total: true,
      marginAmount: true,
      taxPercent: true,
      items: { select: { productId: true, quantity: true, discountPercent: true } },
    },
  });
  if (!existing) throw serviceError("Quotation not found", 404);

  const requestedItems = Array.isArray(input?.items)
    ? input.items
    : existing.items.map((item) => ({
        productId: item.productId,
        quantity: input?.quantity ?? item.quantity,
        discountPercent: input?.discount ?? item.discountPercent,
      }));
  const rawTaxPercent = input?.taxPercent ?? existing.taxPercent;
  const calculated = await calculateQuote(prismaClient, {
    customerId: existing.customerId,
    taxPercent: rawTaxPercent != null ? String(rawTaxPercent) : "0",
    items: requestedItems,
  });
  const risk = calculateBlendedDiscountRisk(calculated.items);
  const approvalDecision = await evaluateApproval(prismaClient, risk);

  const currentItems = existing.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    discountPercent: item.discountPercent,
  }));
  const sumQuantity = (items) => items.reduce((sum, item) => sum + Number(item.quantity), 0);
  const scenario = {
    subtotal: calculated.subtotal,
    discountAmount: calculated.discountAmount,
    taxPercent: calculated.taxPercent,
    taxAmount: calculated.taxAmount,
    total: calculated.total,
    marginAmount: "0.00",
    approvalRequired: approvalDecision.approvalRequired,
    risk,
    items: calculated.items,
  };
  return {
    current: {
      quantity: sumQuantity(currentItems),
      discount: String(existing.discountPercent),
      subtotal: String(existing.subtotal),
      total: String(existing.total),
      margin: String(existing.marginAmount),
    },
    scenario: {
      quantity: sumQuantity(requestedItems),
      discount: risk.blendedDiscountPercent,
      subtotal: scenario.subtotal,
      total: scenario.total,
      margin: scenario.marginAmount,
      paymentTerms: input?.paymentTerms ?? null,
    },
    impact: {
      totalDelta: (Number(scenario.total) - Number(existing.total)).toFixed(2),
      marginDelta: (Number(scenario.marginAmount) - Number(existing.marginAmount)).toFixed(2),
      discountDelta: (Number(risk.blendedDiscountPercent) - Number(existing.discountPercent)).toFixed(2),
      approvalRequired: approvalDecision.approvalRequired,
      riskChange: { current: null, scenario: risk },
    },
    ...scenario,
  };
};

export const updateQuotation = async (prismaClient, id, input) => {
  const existing = await prismaClient.quotation.findUnique({
    where: { id },
    select: { id: true, status: true, salespersonId: true },
  });
  if (!existing) throw serviceError("Quotation not found", 404);
  if (existing.status !== "DRAFT")
    throw serviceError("Only DRAFT quotations can be updated", 409);
  const calculated = await calculateQuote(prismaClient, input);
  const calculatedRisk = calculateBlendedDiscountRisk(calculated.items);
  const approvalDecision = await evaluateApproval(prismaClient, calculatedRisk);

  return prismaClient.$transaction(async (transaction) => {
    await transaction.quotationItem.deleteMany({ where: { quotationId: id } });
    await transaction.quotation.update({
      where: { id },
      data: {
        customerId: calculated.normalized.customerId,
        status: approvalDecision.approvalRequired
          ? "PENDING_APPROVAL"
          : "DRAFT",
        subtotal: calculated.subtotal,
        discountPercent: "0",
        discountAmount: calculated.discountAmount,
        taxPercent: calculated.taxPercent,
        taxAmount: calculated.taxAmount,
        total: calculated.total,
        marginAmount: "0.00",
        items: {
          create: calculated.items.map(
            ({ maxAllowedDiscountPercent, compliant, ruleFound, ...item }) =>
              item,
          ),
        },
      },
    });
    await transaction.approvalRequest.deleteMany({
      where: { quotationId: id },
    });
    await createApprovalRequests(
      transaction,
      id,
      existing.salespersonId || "",
      approvalDecision,
      calculatedRisk,
    );
    const quotation = await transaction.quotation.findUnique({
      where: { id },
      select: QUOTATION_FIELDS,
    });
    return serializeQuotation(
      withRisk(
        quotation,
        quotation.items.map((item, index) => ({
          ...item,
          ...calculated.items[index],
        })),
      ),
    );
  });
};

const decorateQuotation = async (prismaClient, quotation) => {
  if (!quotation.customer || !quotation.items)
    return serializeQuotation(quotation);
  const items = await Promise.all(
    quotation.items.map(async (item) => {
      const governance = await validateLineDiscount(prismaClient, {
        customerTier: quotation.customer.customerTier,
        productCategory: item.product.category,
        discountPercent: item.discountPercent,
      });
      return { ...item, ...governance };
    }),
  );
  return serializeQuotation(withRisk(quotation, items));
};

export const sendQuotation = async (prismaClient, id) => {
  return prismaClient.$transaction(async (transaction) => {
    const existing = await transaction.quotation.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    
    if (!existing) {
      throw serviceError("Quotation not found", 404);
    }
    
    if (existing.status !== "APPROVED") {
      throw serviceError("Only APPROVED quotations can be sent", 409);
    }
    
    const pendingApprovals = await transaction.approvalRequest.count({
      where: { quotationId: id, status: "PENDING" },
    });
    
    if (pendingApprovals > 0) {
      throw serviceError("Cannot send quotation with pending approvals", 409);
    }

    const updated = await transaction.quotation.update({
      where: { id },
      data: { status: "SENT" },
      select: QUOTATION_FIELDS,
    });
    
    return decorateQuotation(transaction, updated);
  });
};
