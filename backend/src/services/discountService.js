const serviceError = (message, statusCode) =>
  Object.assign(new Error(message), { statusCode });

const parsePercent = (value, field = "discountPercent") => {
  if (typeof value !== "string" && typeof value !== "number") {
    throw serviceError(`${field} must be numeric`, 400);
  }
  const normalized = String(value).trim();
  if (
    !/^\d+(\.\d{1,2})?$/.test(normalized) ||
    !Number.isFinite(Number(normalized))
  ) {
    throw serviceError(`${field} must be finite and numeric`, 400);
  }
  const numeric = Number(normalized);
  if (numeric < 0 || numeric > 100) {
    throw serviceError(`${field} must be between 0 and 100`, 400);
  }
  return normalized;
};

export const getApplicableDiscountRule = async (
  prismaClient,
  customerTier,
  productCategory,
) => {
  const rule = await prismaClient.discountRule.findUnique({
    where: {
      customerTier_productCategory: {
        customerTier,
        productCategory,
      },
    },
    select: { maxDiscountPercent: true },
  });

  return {
    maxAllowedDiscountPercent: rule ? String(rule.maxDiscountPercent) : "0",
    ruleFound: Boolean(rule),
  };
};

export const validateLineDiscount = async (
  prismaClient,
  { customerTier, productCategory, discountPercent },
) => {
  const requestedDiscountPercent = parsePercent(discountPercent);
  const rule = await getApplicableDiscountRule(
    prismaClient,
    customerTier,
    productCategory,
  );

  return {
    requestedDiscountPercent,
    maxAllowedDiscountPercent: rule.maxAllowedDiscountPercent,
    compliant:
      Number(requestedDiscountPercent) <=
      Number(rule.maxAllowedDiscountPercent),
    ruleFound: rule.ruleFound,
  };
};

export const validateDiscountPercent = parsePercent;
