/**
 * Pricing Service
 *
 * Authoritative server-side pricing calculations.
 * The frontend must NEVER replicate these calculations.
 */

import { Decimal } from "@prisma/client/runtime/library";

/**
 * Resolve the unit price for a product.
 * Currently uses product.basePrice; extensible for price-list lookups.
 */
export const resolveUnitPrice = (product) => {
  return new Decimal(product.basePrice);
};

/**
 * Calculate a single quotation line item.
 *
 * @param {object} product - The product record
 * @param {number|string} quantity - Requested quantity
 * @param {number|string} discountPercent - Requested discount percentage
 * @returns {{ unitPrice, discountAmount, lineTotal }} - all as Decimal
 */
export const calculateLineItem = (product, quantity, discountPercent) => {
  const unitPrice = resolveUnitPrice(product);
  const qty = new Decimal(quantity);
  const discPct = new Decimal(discountPercent || 0);

  const grossTotal = unitPrice.mul(qty);
  const discountAmount = grossTotal.mul(discPct).div(new Decimal(100)).toDecimalPlaces(2);
  const lineTotal = grossTotal.sub(discountAmount);

  return {
    unitPrice,
    discountAmount,
    lineTotal,
  };
};

/**
 * Calculate quotation-level totals from already-calculated line items.
 *
 * @param {Array<{ unitPrice: Decimal, quantity: Decimal, discountPercent: Decimal, discountAmount: Decimal, lineTotal: Decimal }>} lineItems
 * @param {number|string} taxPercent
 * @returns {{ subtotal, discountPercent, discountAmount, taxAmount, total, marginAmount }}
 */
export const calculateQuotationTotals = (lineItems, taxPercent) => {
  let subtotal = new Decimal(0);
  let totalDiscountAmount = new Decimal(0);
  let totalGross = new Decimal(0);

  for (const item of lineItems) {
    subtotal = subtotal.add(item.lineTotal);
    totalDiscountAmount = totalDiscountAmount.add(item.discountAmount);
    totalGross = totalGross.add(new Decimal(item.unitPrice).mul(new Decimal(item.quantity)));
  }

  const taxPct = new Decimal(taxPercent || 0);
  const taxAmount = subtotal.mul(taxPct).div(new Decimal(100)).toDecimalPlaces(2);
  const total = subtotal.add(taxAmount);

  // Blended discount percent = total discount / total gross × 100
  const discountPercent = totalGross.isZero()
    ? new Decimal(0)
    : totalDiscountAmount.div(totalGross).mul(new Decimal(100)).toDecimalPlaces(2);

  // Margin = subtotal − (sum of cost). Without cost data, margin = subtotal (100% margin)
  // For now, marginAmount represents the post-discount revenue
  const marginAmount = subtotal;

  return {
    subtotal,
    discountPercent,
    discountAmount: totalDiscountAmount,
    taxPercent: taxPct,
    taxAmount,
    total,
    marginAmount,
  };
};
