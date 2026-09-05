/**
 * Discount Governance Service
 *
 * Enforces discount rules based on customer tier and product category.
 * Calculates blended discount risk across quotation lines.
 */

import { Decimal } from "@prisma/client/runtime/library";

/**
 * Look up the applicable discount rule for a customer tier + product category.
 * Returns null if no rule exists (meaning no cap).
 */
export const getDiscountRule = async (prisma, customerTier, productCategory) => {
  return prisma.discountRule.findUnique({
    where: {
      customerTier_productCategory: { customerTier, productCategory },
    },
  });
};

/**
 * Validate a single line's discount against the governing rule.
 */
export const validateLineDiscount = (rule, requestedPercent) => {
  const requested = new Decimal(requestedPercent || 0);

  if (!rule || !rule.active) {
    // No active rule — discount is uncapped but still recorded
    return {
      compliant: true,
      maxAllowed: null,
      requestedPercent: requested.toFixed(2),
      violation: null,
    };
  }

  const maxAllowed = new Decimal(rule.maxDiscountPercent);
  const compliant = requested.lte(maxAllowed);

  return {
    compliant,
    maxAllowed: maxAllowed.toFixed(2),
    requestedPercent: requested.toFixed(2),
    violation: compliant
      ? null
      : `Discount ${requested.toFixed(2)}% exceeds maximum allowed ${maxAllowed.toFixed(2)}% for tier "${rule.customerTier}" / category "${rule.productCategory}"`,
  };
};

/**
 * Calculate blended (weighted-average) discount across all quotation lines.
 * Weight = line subtotal before discount (unitPrice × quantity).
 */
export const calculateBlendedDiscount = (lineItems) => {
  let totalWeight = new Decimal(0);
  let weightedDiscount = new Decimal(0);

  for (const item of lineItems) {
    const lineSubtotal = new Decimal(item.unitPrice).mul(new Decimal(item.quantity));
    totalWeight = totalWeight.add(lineSubtotal);
    weightedDiscount = weightedDiscount.add(
      lineSubtotal.mul(new Decimal(item.discountPercent || 0)),
    );
  }

  if (totalWeight.isZero()) {
    return { blendedDiscountPercent: "0.00", riskLevel: "LOW" };
  }

  const blended = weightedDiscount.div(totalWeight);
  const blendedFixed = blended.toDecimalPlaces(2);

  let riskLevel = "LOW";
  if (blendedFixed.gte(new Decimal(15))) {
    riskLevel = "HIGH";
  } else if (blendedFixed.gte(new Decimal(8))) {
    riskLevel = "MEDIUM";
  }

  return {
    blendedDiscountPercent: blendedFixed.toFixed(2),
    riskLevel,
  };
};

/**
 * Determine if the quotation requires approval based on discount violations.
 */
export const requiresApproval = (lineViolations) => {
  return lineViolations.some((v) => !v.compliant);
};
