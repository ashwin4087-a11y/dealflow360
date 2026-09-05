const INTERNAL_ROLES = new Set(["ADMIN", "SALESPERSON", "MANAGER", "FINANCE", "OPERATIONS"]);
const DAY_MS = 24 * 60 * 60 * 1000;
const error = (message, statusCode) => Object.assign(new Error(message), { statusCode });

const ageInDays = (value, now) => Math.max(0, Math.floor((now.getTime() - new Date(value).getTime()) / DAY_MS));

const evaluateQuotation = (quotation, now) => {
  const causes = [];
  const impact = [];
  let score = 0;
  const discount = Number(quotation.risk?.blendedDiscountPercent || quotation.discountPercent || 0);
  if (discount > 20) {
    score += 35;
    causes.push("Excessive discount");
    impact.push("Revenue and approval pressure from a high concession");
  } else if (discount > 10) {
    score += 20;
    causes.push("Discount requires governance review");
    impact.push("Approval dependency may slow progression");
  }
  const age = ageInDays(quotation.updatedAt || quotation.createdAt, now);
  if (age >= 14) {
    score += 30;
    causes.push("Deal inactive for 14 or more days");
    impact.push("Forecast timing and customer momentum are at risk");
  } else if (age >= 7) {
    score += 15;
    causes.push("Deal has not changed for 7 or more days");
    impact.push("Customer momentum may be weakening");
  }
  const pendingApproval = (quotation.approvalRequests || []).some((request) => request.status === "PENDING");
  if (pendingApproval) {
    score += 20;
    causes.push("Approval is pending");
    impact.push("Quotation cannot progress until required approval is resolved");
  }
  const negotiation = quotation.negotiations?.[0];
  if (negotiation && ageInDays(negotiation.updatedAt, now) >= 7 && !["ACCEPTED", "CLOSED", "REJECTED"].includes(negotiation.status)) {
    score += 25;
    causes.push("Negotiation has stalled");
    impact.push("Commercial resolution is delayed");
  }
  const status = score >= 60 ? "CRITICAL" : score >= 35 ? "AT_RISK" : score >= 15 ? "WATCH" : "HEALTHY";
  return {
    quotationId: quotation.id,
    quotationNumber: quotation.quotationNumber,
    status,
    riskScore: Math.min(100, score),
    rootCauses: causes,
    businessImpact: impact,
    lastEvaluatedAt: now.toISOString(),
    ...(INTERNAL_ROLES.has("INTERNAL") ? {} : {}),
  };
};

const healthSelect = {
  id: true,
  quotationNumber: true,
  status: true,
  discountPercent: true,
  total: true,
  createdAt: true,
  updatedAt: true,
  approvalRequests: { select: { status: true, approvalRole: true, createdAt: true } },
  negotiations: { select: { status: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 1 },
  items: { select: { quantity: true, unitPrice: true, discountAmount: true, productId: true } },
};

const riskForItems = (items) => {
  let gross = 0;
  let discount = 0;
  for (const item of items) {
    gross += Number(item.quantity) * Number(item.unitPrice);
    discount += Number(item.discountAmount);
  }
  return gross ? (discount / gross) * 100 : 0;
};

const addRisk = (quotation) => ({ ...quotation, risk: { blendedDiscountPercent: riskForItems(quotation.items) } });

export const listDealHealth = async (prismaClient, user) => {
  const now = new Date();
  const where = user.role === "CUSTOMER" ? { customer: { user: { id: user.id } } } : { status: { notIn: ["CANCELLED", "REJECTED", "CONVERTED"] } };
  const quotations = await prismaClient.quotation.findMany({ where, select: healthSelect, orderBy: { updatedAt: "desc" } });
  return quotations.map((quotation) => {
    const result = evaluateQuotation(addRisk(quotation), now);
    if (user.role === "CUSTOMER") return { quotationId: result.quotationId, quotationNumber: result.quotationNumber, status: result.status, lastEvaluatedAt: result.lastEvaluatedAt };
    return result;
  });
};

export const getDealHealth = async (prismaClient, user, quotationId) => {
  const quotation = await prismaClient.quotation.findUnique({ where: { id: quotationId }, select: healthSelect });
  if (!quotation) throw error("Quotation not found", 404);
  if (user.role === "CUSTOMER") {
    const owned = await prismaClient.quotation.findFirst({ where: { id: quotationId, customer: { user: { id: user.id } } }, select: { id: true } });
    if (!owned) throw error("Quotation not found", 404);
  }
  const result = evaluateQuotation(addRisk(quotation), new Date());
  return user.role === "CUSTOMER"
    ? { quotationId: result.quotationId, quotationNumber: result.quotationNumber, status: result.status, lastEvaluatedAt: result.lastEvaluatedAt }
    : result;
};
