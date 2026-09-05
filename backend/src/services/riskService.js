const toCents = (value, field) => {
  const normalized = String(value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error(`${field} must be a valid monetary value`);
  }
  const [whole, fraction = ""] = normalized.split(".");
  return BigInt(whole) * 100n + BigInt((fraction + "00").slice(0, 2));
};

const centsToString = (cents) =>
  `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;

const grossLineCents = (quantity, unitPrice) => {
  const quantityText = String(quantity);
  const [quantityWhole, quantityFraction = ""] = quantityText.split(".");
  const quantityScaled = BigInt(quantityWhole + quantityFraction);
  const quantityScale = 10n ** BigInt(quantityFraction.length);
  const unitPriceCents = toCents(unitPrice, "unitPrice");
  return (quantityScaled * unitPriceCents + quantityScale / 2n) / quantityScale;
};

const ratioPercentToString = (part, whole) => {
  if (whole === 0n) return "0.00";
  const scaledPercent = (part * 10000n * 100n + whole / 2n) / whole;
  return `${scaledPercent / 10000n}.${String(scaledPercent % 10000n).padStart(4, "0")}`;
};

/**
 * Blended discount is value-weighted, not a simple average:
 * totalDiscount / totalGross * 100.
 * A zero-gross quotation deterministically returns 0.00%.
 */
export const calculateBlendedDiscountRisk = (items = []) => {
  let totalGrossCents = 0n;
  let totalDiscountCents = 0n;
  let violatingLineCount = 0;

  for (const item of items) {
    const grossCents = grossLineCents(item.quantity, item.unitPrice);
    const discountCents = toCents(item.discountAmount, "discountAmount");
    totalGrossCents += grossCents;
    totalDiscountCents += discountCents;
    if (item.compliant === false) violatingLineCount += 1;
  }

  const numberOfLines = items.length;
  return {
    totalGross: centsToString(totalGrossCents),
    totalDiscount: centsToString(totalDiscountCents),
    blendedDiscountPercent: ratioPercentToString(
      totalDiscountCents,
      totalGrossCents,
    ),
    numberOfLines,
    violatingLineCount,
    compliantLineCount: numberOfLines - violatingLineCount,
    hasLineViolations: violatingLineCount > 0,
  };
};
