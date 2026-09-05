import crypto from "node:crypto";

const serviceError = (message, statusCode) =>
  Object.assign(new Error(message), { statusCode });

const ORDER_FIELDS = {
  id: true,
  orderNumber: true,
  quotationId: true,
  createdAt: true,
  updatedAt: true,
};

export const convertQuotationToOrder = async (prismaClient, quotationId) => {
  return prismaClient.$transaction(async (transaction) => {
    // 1. Find quotation and verify existence/status
    const quotation = await transaction.quotation.findUnique({
      where: { id: quotationId },
      select: { id: true, status: true },
    });
    
    if (!quotation) {
      throw serviceError("Quotation not found", 404);
    }
    
    if (quotation.status === "CONVERTED") {
      throw serviceError("Quotation has already been converted to an order", 409);
    }
    
    if (quotation.status !== "ACCEPTED") {
      throw serviceError("Only ACCEPTED quotations can be converted", 409);
    }
    
    // 2. Double check if order already exists (though @unique on schema also protects)
    const existingOrder = await transaction.order.findUnique({
      where: { quotationId },
    });
    
    if (existingOrder) {
      throw serviceError("An order already exists for this quotation", 409);
    }
    
    // 3. Generate Order Number
    const randomSuffix = crypto.randomBytes(4).toString('hex').toUpperCase();
    const orderNumber = `ORD-${randomSuffix}`;
    
    // 4. Update Quotation Status
    await transaction.quotation.update({
      where: { id: quotationId },
      data: { status: "CONVERTED" },
    });
    
    // 5. Create Order
    const newOrder = await transaction.order.create({
      data: {
        orderNumber,
        quotationId,
      },
      select: ORDER_FIELDS,
    });
    
    return newOrder;
  });
};
