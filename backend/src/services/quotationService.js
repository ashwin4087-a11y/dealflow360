/**
 * Quotation Service
 *
 * Creates and retrieves quotations with full server-side pricing,
 * discount governance, and blended risk calculation.
 */

import { Decimal } from "@prisma/client/runtime/library";
import { calculateLineItem, calculateQuotationTotals } from "./pricingService.js";
import {
  getDiscountRule,
  validateLineDiscount,
  calculateBlendedDiscount,
  requiresApproval,
} from "./discountService.js";

/**
 * Generate the next quotation number (QT-000001, QT-000002, etc.)
 */
const generateQuotationNumber = async (prisma) => {
  const latest = await prisma.quotation.findFirst({
    orderBy: { createdAt: "desc" },
    select: { quotationNumber: true },
  });

  let nextNum = 1;
  if (latest?.quotationNumber) {
    const match = /QT-(\d+)/.exec(latest.quotationNumber);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }

  return `QT-${String(nextNum).padStart(6, "0")}`;
};

/**
 * Create a new DRAFT quotation.
 *
 * @param {object} prisma - Prisma client
 * @param {object} params
 * @param {string} params.customerId - The customer ID
 * @param {string} params.salespersonId - From authenticated user
 * @param {Array<{ productId: string, quantity: number, discountPercent: number }>} params.items
 * @param {number} [params.taxPercent=0] - Tax percentage for the quotation
 */
export const createQuotation = async (
  prisma,
  { customerId, salespersonId, items, taxPercent = 0 },
) => {
  // Validate customer exists
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });
  if (!customer) {
    const error = new Error("Customer not found");
    error.statusCode = 400;
    throw error;
  }

  // Validate items array
  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error("At least one quotation item is required");
    error.statusCode = 400;
    throw error;
  }

  // Validate tax percent
  const taxPct = new Decimal(taxPercent || 0);
  if (taxPct.lt(0) || taxPct.gt(100)) {
    const error = new Error("Tax percentage must be between 0 and 100");
    error.statusCode = 400;
    throw error;
  }

  // Resolve all products and validate
  const productIds = items.map((item) => item.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  // Validate each line item
  const calculatedItems = [];
  const lineViolations = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const product = productMap.get(item.productId);

    if (!product) {
      const error = new Error(`Product not found: ${item.productId}`);
      error.statusCode = 400;
      throw error;
    }

    if (!product.active) {
      const error = new Error(`Product is inactive: ${product.name} (${product.sku})`);
      error.statusCode = 400;
      throw error;
    }

    const quantity = Number(item.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      const error = new Error(
        `Invalid quantity for line ${i + 1}: must be a positive number`,
      );
      error.statusCode = 400;
      throw error;
    }

    const discountPercent = Number(item.discountPercent || 0);
    if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      const error = new Error(
        `Invalid discount percentage for line ${i + 1}: must be between 0 and 100`,
      );
      error.statusCode = 400;
      throw error;
    }

    // Calculate pricing for this line
    const lineCalc = calculateLineItem(product, quantity, discountPercent);

    // Validate discount against governance rules
    const rule = await getDiscountRule(prisma, customer.customerTier, product.category);
    const validation = validateLineDiscount(rule, discountPercent);

    lineViolations.push({
      lineIndex: i,
      productId: product.id,
      productName: product.name,
      category: product.category,
      ...validation,
    });

    calculatedItems.push({
      productId: product.id,
      quantity: new Decimal(quantity),
      unitPrice: lineCalc.unitPrice,
      discountPercent: new Decimal(discountPercent),
      discountAmount: lineCalc.discountAmount,
      lineTotal: lineCalc.lineTotal,
    });
  }

  // Calculate quotation totals
  const totals = calculateQuotationTotals(calculatedItems, taxPercent);

  // Calculate blended discount risk
  const blendedInfo = calculateBlendedDiscount(calculatedItems);
  const needsApproval = requiresApproval(lineViolations);

  // Generate quotation number
  const quotationNumber = await generateQuotationNumber(prisma);

  // Create the quotation with all items in a transaction
  const quotation = await prisma.quotation.create({
    data: {
      quotationNumber,
      customerId,
      salespersonId,
      status: "DRAFT",
      subtotal: totals.subtotal,
      discountPercent: totals.discountPercent,
      discountAmount: totals.discountAmount,
      taxPercent: totals.taxPercent,
      taxAmount: totals.taxAmount,
      total: totals.total,
      marginAmount: totals.marginAmount,
      items: {
        create: calculatedItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent,
          discountAmount: item.discountAmount,
          lineTotal: item.lineTotal,
        })),
      },
    },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, sku: true, category: true, basePrice: true },
          },
        },
      },
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          company: true,
          customerTier: true,
        },
      },
    },
  });

  return {
    ...quotation,
    discountCompliance: {
      blendedDiscountPercent: blendedInfo.blendedDiscountPercent,
      riskLevel: blendedInfo.riskLevel,
      lineViolations,
      requiresApproval: needsApproval,
    },
  };
};

/**
 * Get a single quotation by ID with all relations.
 */
export const getQuotation = async (prisma, id) => {
  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, sku: true, category: true, basePrice: true },
          },
        },
      },
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
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!quotation) {
    const error = new Error("Quotation not found");
    error.statusCode = 404;
    throw error;
  }

  return quotation;
};
