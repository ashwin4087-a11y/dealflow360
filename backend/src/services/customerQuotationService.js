const serviceError = (message, statusCode) =>
  Object.assign(new Error(message), { statusCode });

const decimalString = (value) => String(value);

const CUSTOMER_QUOTATION_FIELDS = {
  id: true,
  customerId: true,
  quotationNumber: true,
  status: true,
  subtotal: true,
  discountPercent: true,
  discountAmount: true,
  taxPercent: true,
  taxAmount: true,
  total: true,
  createdAt: true,
  updatedAt: true,
  customer: {
    select: {
      id: true,
      name: true,
      company: true,
    },
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
          name: true,
          sku: true,
          category: true,
          productType: true,
        },
      },
    },
  },
};

const serializeCustomerQuotation = (quotation) => {
  const monetaryFields = [
    "subtotal",
    "discountAmount",
    "taxAmount",
    "total",
  ];
  
  const serialized = { ...quotation };
  
  for (const field of monetaryFields) {
    if (serialized[field] !== undefined && serialized[field] !== null) {
      serialized[field] = decimalString(serialized[field]);
    }
  }
  
  if (serialized.taxPercent !== undefined && serialized.taxPercent !== null) {
    serialized.taxPercent = decimalString(serialized.taxPercent);
  }
  if (serialized.discountPercent !== undefined && serialized.discountPercent !== null) {
    serialized.discountPercent = decimalString(serialized.discountPercent);
  }
  
  if (serialized.items) {
    serialized.items = serialized.items.map((item) => ({
      ...item,
      quantity: decimalString(item.quantity),
      unitPrice: decimalString(item.unitPrice),
      discountPercent: decimalString(item.discountPercent),
      discountAmount: decimalString(item.discountAmount),
      lineTotal: decimalString(item.lineTotal),
    }));
  }
  
  return serialized;
};

const resolveCustomerIdentity = async (prismaClient, userId) => {
  const user = await prismaClient.user.findUnique({
    where: { id: userId },
    select: { customerId: true },
  });
  
  if (!user || !user.customerId) {
    throw serviceError("Customer account not linked or not found", 403);
  }
  
  return user.customerId;
};

export const listCustomerQuotations = async (prismaClient, userId) => {
  const customerId = await resolveCustomerIdentity(prismaClient, userId);
  
  const quotations = await prismaClient.quotation.findMany({
    where: { customerId },
    select: CUSTOMER_QUOTATION_FIELDS,
    orderBy: { createdAt: "desc" },
  });
  
  return quotations.map(serializeCustomerQuotation);
};

export const getCustomerQuotation = async (prismaClient, userId, quotationId) => {
  const customerId = await resolveCustomerIdentity(prismaClient, userId);
  
  const quotation = await prismaClient.quotation.findUnique({
    where: { id: quotationId },
    select: CUSTOMER_QUOTATION_FIELDS,
  });
  
  if (!quotation || quotation.customer?.id !== customerId) {
    throw serviceError("Quotation not found", 404);
  }
  
  return serializeCustomerQuotation(quotation);
};

export const acceptQuotation = async (prismaClient, userId, quotationId) => {
  const customerId = await resolveCustomerIdentity(prismaClient, userId);
  
  return prismaClient.$transaction(async (transaction) => {
    const existing = await transaction.quotation.findUnique({
      where: { id: quotationId },
      select: { id: true, customerId: true, status: true },
    });
    
    if (!existing || existing.customerId !== customerId) {
      throw serviceError("Quotation not found", 404);
    }
    
    if (existing.status === "ACCEPTED") {
      throw serviceError("Quotation is already accepted", 409);
    }
    
    if (existing.status !== "SENT") {
      throw serviceError("Only SENT quotations can be accepted", 409);
    }
    
    const updated = await transaction.quotation.update({
      where: { id: quotationId },
      data: { status: "ACCEPTED" },
      select: CUSTOMER_QUOTATION_FIELDS,
    });
    
    return serializeCustomerQuotation(updated);
  });
};

export const rejectQuotation = async (prismaClient, userId, quotationId, reason = "") => {
  const customerId = await resolveCustomerIdentity(prismaClient, userId);
  
  return prismaClient.$transaction(async (transaction) => {
    const existing = await transaction.quotation.findUnique({
      where: { id: quotationId },
      select: { id: true, customerId: true, status: true },
    });
    
    if (!existing || existing.customerId !== customerId) {
      throw serviceError("Quotation not found", 404);
    }
    
    if (existing.status === "REJECTED") {
      throw serviceError("Quotation is already rejected", 409);
    }
    
    if (existing.status !== "SENT") {
      throw serviceError("Only SENT quotations can be rejected", 409);
    }
    
    const updated = await transaction.quotation.update({
      where: { id: quotationId },
      data: { status: "REJECTED" },
      select: CUSTOMER_QUOTATION_FIELDS,
    });
    
    // If the schema supported rejection reasons on the Quotation, we would save it here.
    // Currently, rejection reasons are only on ApprovalRequest.
    
    return serializeCustomerQuotation(updated);
  });
};
