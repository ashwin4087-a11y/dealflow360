import { calculateQuote, getQuotation } from "./quotationService.js";
import { evaluateApproval } from "./approvalService.js";
import { calculateBlendedDiscountRisk } from "./riskService.js";

const serviceError = (message, statusCode) =>
  Object.assign(new Error(message), { statusCode });

const INTERNAL_ROLES = new Set(["ADMIN", "SALES", "SALESPERSON", "MANAGER", "FINANCE", "OPERATIONS"]);

const NEGOTIATION_INCLUDE = {
  quotation: {
    select: {
      id: true,
      quotationNumber: true,
      customerId: true,
      salespersonId: true,
      status: true,
      subtotal: true,
      discountPercent: true,
      total: true,
      taxPercent: true,
      marginAmount: true,
      items: {
        select: {
          productId: true,
          quantity: true,
          unitPrice: true,
          discountPercent: true,
          product: { select: { id: true, name: true, category: true } },
        },
      },
    },
  },
  customer: { select: { id: true, name: true, company: true } },
  creator: { select: { id: true, name: true, email: true, role: true } },
  events: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      eventType: true,
      message: true,
      createdAt: true,
      actor: { select: { id: true, name: true, role: true } },
    },
  },
};

const decimalString = (value) => (value === null || value === undefined ? null : String(value));
const parseDecimal = (value, field, { positive = false } = {}) => {
  if (typeof value !== "string" && typeof value !== "number")
    throw serviceError(`${field} must be numeric`, 400);
  const normalized = String(value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized))
    throw serviceError(`${field} must be a valid number`, 400);
  if (positive && Number(normalized) <= 0)
    throw serviceError(`${field} must be greater than zero`, 400);
  return normalized;
};

const optionalText = (value, field) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw serviceError(`${field} must be text`, 400);
  return value.trim();
};

const pick = (body, ...names) => names.map((name) => body?.[name]).find((value) => value !== undefined);

const serializeEvent = (event, customerView) => ({
  id: event.id,
  eventType: event.eventType,
  ...(event.message ? { message: event.message } : {}),
  createdAt: event.createdAt,
  ...(!customerView && event.actor ? { actor: event.actor } : {}),
});

const serializeNegotiation = (negotiation, customerView = false) => {
  const data = {
    id: negotiation.id,
    quotationId: negotiation.quotationId,
    customerId: negotiation.customerId,
    status: negotiation.status,
    customerRequestedDiscount: decimalString(negotiation.customerRequestedDiscount),
    customerRequestedQuantity: decimalString(negotiation.customerRequestedQuantity),
    customerRequestedPaymentTerms: negotiation.customerRequestedPaymentTerms,
    customerMessage: negotiation.customerMessage,
    currentDiscount: decimalString(negotiation.currentDiscount),
    proposedDiscount: decimalString(negotiation.proposedDiscount),
    proposedQuantity: decimalString(negotiation.proposedQuantity),
    proposedPaymentTerms: negotiation.proposedPaymentTerms,
    proposedMessage: negotiation.proposedMessage,
    calculatedSubtotal: decimalString(negotiation.calculatedSubtotal),
    calculatedTotal: decimalString(negotiation.calculatedTotal),
    approvalRequired: negotiation.approvalRequired,
    createdAt: negotiation.createdAt,
    updatedAt: negotiation.updatedAt,
    events: (negotiation.events || []).map((event) => serializeEvent(event, customerView)),
  };
  if (!customerView) {
    data.createdBy = negotiation.createdBy;
    data.calculatedMargin = decimalString(negotiation.calculatedMargin);
    data.creator = negotiation.creator;
    data.customer = negotiation.customer;
  }
  return data;
};

const loadNegotiation = async (prismaClient, id) => {
  const negotiation = await prismaClient.negotiation.findUnique({
    where: { id },
    include: NEGOTIATION_INCLUDE,
  });
  if (!negotiation) throw serviceError("Negotiation not found", 404);
  return negotiation;
};

const customerIdForUser = async (prismaClient, userId) => {
  const user = await prismaClient.user.findUnique({
    where: { id: userId },
    select: { customerId: true },
  });
  if (!user?.customerId) throw serviceError("Customer account not linked", 403);
  return user.customerId;
};

const assertAccess = async (prismaClient, negotiation, user) => {
  if (INTERNAL_ROLES.has(user.role)) return;
  if (user.role !== "CUSTOMER") throw serviceError("Insufficient permissions", 403);
  const customerId = await customerIdForUser(prismaClient, user.id);
  if (negotiation.customerId !== customerId) throw serviceError("Negotiation not found", 404);
};

const calculateImpact = async (prismaClient, quotation, discount, quantity) => {
  const proposedDiscount = parseDecimal(discount, "discount");
  const proposedItems = quotation.items.map((item) => ({
    productId: item.productId,
    quantity: quantity === undefined ? String(item.quantity) : parseDecimal(quantity, "quantity", { positive: true }),
    discountPercent: proposedDiscount,
  }));
  const calculated = await calculateQuote(prismaClient, {
    customerId: quotation.customerId,
    taxPercent: String(quotation.taxPercent || "0"),
    items: proposedItems,
  });
  const risk = calculateBlendedDiscountRisk(calculated.items);
  const approval = await evaluateApproval(prismaClient, risk);
  return {
    proposedDiscount,
    proposedQuantity: quantity === undefined ? null : parseDecimal(quantity, "quantity", { positive: true }),
    calculatedSubtotal: calculated.subtotal,
    calculatedTotal: calculated.total,
    calculatedMargin: String(quotation.marginAmount || "0.00"),
    approvalRequired: approval.approvalRequired,
  };
};

const addEvent = (transaction, negotiationId, actorId, eventType, message) =>
  transaction.negotiationEvent.create({
    data: { negotiationId, actorId, eventType, message },
  });

export const createNegotiation = async (prismaClient, user, quotationId) => {
  const quotation = await getQuotation(prismaClient, quotationId);
  if (user.role === "SALESPERSON" && quotation.salesperson?.id !== user.id)
    throw serviceError("You can only negotiate your own quotations", 403);
  const existing = await prismaClient.negotiation.findFirst({
    where: { quotationId, status: { not: "CLOSED" } },
  });
  if (existing) return serializeNegotiation(await loadNegotiation(prismaClient, existing.id));
  const currentDiscount = decimalString(quotation.discountPercent) || "0.00";
  const negotiation = await prismaClient.$transaction(async (transaction) => {
    const created = await transaction.negotiation.create({
      data: {
        quotationId,
        customerId: quotation.customer.id,
        createdBy: user.id,
        currentDiscount,
      },
    });
    await addEvent(transaction, created.id, user.id, "NEGOTIATION_CREATED", "Negotiation opened");
    return created;
  });
  return serializeNegotiation(await loadNegotiation(prismaClient, negotiation.id));
};

export const listNegotiations = async (prismaClient, user) => {
  const where = user.role === "CUSTOMER" ? { customerId: await customerIdForUser(prismaClient, user.id) } : {};
  const negotiations = await prismaClient.negotiation.findMany({
    where,
    include: NEGOTIATION_INCLUDE,
    orderBy: { updatedAt: "desc" },
  });
  return negotiations.map((negotiation) => serializeNegotiation(negotiation, user.role === "CUSTOMER"));
};

export const getNegotiation = async (prismaClient, user, id) => {
  const negotiation = await loadNegotiation(prismaClient, id);
  await assertAccess(prismaClient, negotiation, user);
  return serializeNegotiation(negotiation, user.role === "CUSTOMER");
};

export const getNegotiationByQuotation = async (prismaClient, user, quotationId) => {
  const negotiation = await prismaClient.negotiation.findFirst({
    where: { quotationId },
    include: NEGOTIATION_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  if (!negotiation) throw serviceError("Negotiation not found", 404);
  await assertAccess(prismaClient, negotiation, user);
  return serializeNegotiation(negotiation, user.role === "CUSTOMER");
};

export const createCounteroffer = async (prismaClient, user, id, body = {}) => {
  const negotiation = await loadNegotiation(prismaClient, id);
  await assertAccess(prismaClient, negotiation, user);
  if (!["SALESPERSON", "CUSTOMER"].includes(user.role))
    throw serviceError("Only Sales or Customer can create counteroffers", 403);
  if (["CLOSED", "REJECTED", "ACCEPTED"].includes(negotiation.status))
    throw serviceError("Negotiation is no longer open", 409);

  const isCustomer = user.role === "CUSTOMER";
  const discount = pick(body, isCustomer ? "customerRequestedDiscount" : "proposedDiscount", "discount");
  const quantity = pick(body, isCustomer ? "customerRequestedQuantity" : "proposedQuantity", "quantity");
  if (discount === undefined || quantity === undefined)
    throw serviceError("discount and quantity are required", 400);
  const impact = await calculateImpact(prismaClient, negotiation.quotation, discount, quantity);
  const paymentTerms = optionalText(pick(body, isCustomer ? "customerRequestedPaymentTerms" : "proposedPaymentTerms", "paymentTerms"), "paymentTerms");
  const message = optionalText(pick(body, isCustomer ? "customerMessage" : "proposedMessage", "message"), "message");
  const data = isCustomer
    ? {
        customerRequestedDiscount: impact.proposedDiscount,
        customerRequestedQuantity: impact.proposedQuantity,
        customerRequestedPaymentTerms: paymentTerms,
        customerMessage: message,
        proposedDiscount: impact.proposedDiscount,
        proposedQuantity: impact.proposedQuantity,
        proposedPaymentTerms: paymentTerms,
        proposedMessage: message,
        status: "COUNTEROFFER_REQUESTED",
      }
    : {
        proposedDiscount: impact.proposedDiscount,
        proposedQuantity: impact.proposedQuantity,
        proposedPaymentTerms: paymentTerms,
        proposedMessage: message,
        status: "COUNTEROFFER_DRAFT",
      };
  const updated = await prismaClient.$transaction(async (transaction) => {
    const saved = await transaction.negotiation.update({
      where: { id },
      data: { ...data, ...impact },
    });
    await addEvent(transaction, id, user.id, isCustomer ? "CUSTOMER_COUNTEROFFER" : "SALES_COUNTEROFFER", message);
    return saved;
  });
  return serializeNegotiation(await loadNegotiation(prismaClient, updated.id), isCustomer);
};

export const submitCounteroffer = async (prismaClient, user, id) => {
  const negotiation = await loadNegotiation(prismaClient, id);
  await assertAccess(prismaClient, negotiation, user);
  if (user.role !== "SALESPERSON" && user.role !== "ADMIN") throw serviceError("Only Sales can submit counteroffers", 403);
  if (negotiation.createdBy === user.id && user.role === "MANAGER") throw serviceError("Self-approval is not allowed", 403);
  if (negotiation.status !== "COUNTEROFFER_DRAFT") throw serviceError("Only draft counteroffers can be submitted", 409);
  const status = negotiation.approvalRequired ? "PENDING_APPROVAL" : "APPROVED";
  await prismaClient.$transaction(async (transaction) => {
    await transaction.negotiation.update({ where: { id }, data: { status } });
    await addEvent(transaction, id, user.id, "SUBMITTED_FOR_APPROVAL", status === "APPROVED" ? "Counteroffer approved without manager review" : "Counteroffer submitted for approval");
  });
  return getNegotiation(prismaClient, user, id);
};

const resolveCounteroffer = async (prismaClient, user, id, status, eventType) => {
  const negotiation = await loadNegotiation(prismaClient, id);
  if (user.role !== "MANAGER" && user.role !== "ADMIN") throw serviceError("Manager permission required", 403);
  if (negotiation.createdBy === user.id && user.role !== "ADMIN") throw serviceError("Self-approval is not allowed", 403);
  if (negotiation.status !== "PENDING_APPROVAL") throw serviceError("Negotiation is not pending approval", 409);
  await prismaClient.$transaction(async (transaction) => {
    await transaction.negotiation.update({ where: { id }, data: { status } });
    await addEvent(transaction, id, user.id, eventType, eventType === "APPROVED" ? "Counteroffer approved" : "Counteroffer rejected");
  });
  return getNegotiation(prismaClient, user, id);
};

export const approveCounteroffer = (prismaClient, user, id) => resolveCounteroffer(prismaClient, user, id, "APPROVED", "APPROVED");
export const rejectCounteroffer = (prismaClient, user, id) => resolveCounteroffer(prismaClient, user, id, "REJECTED", "REJECTED");

export const closeNegotiation = async (prismaClient, user, id) => {
  const negotiation = await loadNegotiation(prismaClient, id);
  await assertAccess(prismaClient, negotiation, user);
  if (user.role !== "CUSTOMER") throw serviceError("Only the customer can accept a negotiation", 403);
  if (negotiation.status !== "APPROVED") throw serviceError("Only approved negotiations can be accepted", 409);
  await prismaClient.$transaction(async (transaction) => {
    await transaction.negotiation.update({ where: { id }, data: { status: "ACCEPTED" } });
    await addEvent(transaction, id, user.id, "ACCEPTED", "Customer accepted the counteroffer");
    await transaction.negotiation.update({ where: { id }, data: { status: "CLOSED" } });
    await addEvent(transaction, id, user.id, "CLOSED", "Negotiation closed");
    await transaction.quotation.update({ where: { id: negotiation.quotationId }, data: { status: "ACCEPTED" } });
  });
  return getNegotiation(prismaClient, user, id);
};