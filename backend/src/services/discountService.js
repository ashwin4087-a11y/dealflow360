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

const toCents = (value) => {
  const normalized = String(value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw serviceError("grossLineAmount must be a valid monetary value", 400);
  }
  const [whole, fraction = ""] = normalized.split(".");
  return BigInt(whole) * 100n + BigInt((fraction + "00").slice(0, 2));
};

export const calculateDiscountAmount = (grossLineAmount, discountPercent) => {
  const amountCents = toCents(grossLineAmount);
  const percent = parsePercent(discountPercent);
  const [whole, fraction = ""] = percent.split(".");
  const percentScaled =
    BigInt(whole) * 100n + BigInt((fraction + "00").slice(0, 2));
  const discountCents = (amountCents * percentScaled + 5000n) / 10000n;
  return `${discountCents / 100n}.${String(discountCents % 100n).padStart(2, "0")}`;
};

export const getApplicableDiscountRule = async (
  prismaClient,
  customerTier,
  productCategory,
) => {
  const rule = await prismaClient.discountRule.findFirst({
    where: { customerTier, productCategory, active: true },
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
