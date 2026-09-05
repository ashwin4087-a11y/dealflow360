/**
 * Customer Service
 * Queries the Customer table through Prisma.
 */

export const getCustomer = async (prisma, id) => {
  const customer = await prisma.customer.findUnique({ where: { id } });

  if (!customer) {
    const error = new Error("Customer not found");
    error.statusCode = 404;
    throw error;
  }

  return customer;
};
