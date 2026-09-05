import crypto from "node:crypto";

const serviceError = (message, statusCode) =>
  Object.assign(new Error(message), { statusCode });

const ORDER_FIELDS = {
  id: true,
  orderNumber: true,
  quotationId: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: {
      id: true,
      quotationItemId: true,
      productId: true,
      quantity: true,
      unitPrice: true,
      lineTotal: true,
    },
  },
};

const serializeOrder = (order) => ({
  ...order,
  items: order.items.map((item) => ({
    ...item,
    quantity: item.quantity.toString(),
    unitPrice: item.unitPrice.toString(),
    lineTotal: item.lineTotal.toString(),
  })),
});

export const listOrders = async (prismaClient) => {
  const orders = await prismaClient.order.findMany({
    select: ORDER_FIELDS,
    orderBy: { createdAt: "desc" },
  });
  return orders.map(serializeOrder);
};

export const convertQuotationToOrder = async (prismaClient, quotationId) => {
  return prismaClient.$transaction(async (transaction) => {
    // 1. Find quotation and verify existence/status
    const quotation = await transaction.quotation.findUnique({
      where: { id: quotationId },
      select: {
        id: true,
        status: true,
        items: {
          select: {
            id: true,
            productId: true,
            quantity: true,
            unitPrice: true,
            lineTotal: true,
            product: { select: { id: true } },
          },
        },
      },
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
    
    // Create the order, its items, and the converted quotation atomically.
    const newOrder = await transaction.order.create({
      data: {
        orderNumber,
        quotationId,
        items: {
          create: quotation.items.map((item) => {
            const quantity = Number(item.quantity);
            if (!Number.isSafeInteger(quantity) || quantity <= 0) {
              throw serviceError(
                "Accepted quotation item quantities must be positive integers",
                409,
              );
            }
            return {
              quotationItemId: item.id,
              productId: item.product.id,
              quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
            };
          }),
        },
      },
      select: ORDER_FIELDS,
    });

    await transaction.quotation.update({
      where: { id: quotationId },
      data: { status: "CONVERTED" },
    });
    
    return newOrder;
  });
};
