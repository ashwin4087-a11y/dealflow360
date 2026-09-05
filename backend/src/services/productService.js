/**
 * Product Service
 * Queries the Product table through Prisma.
 */

export const listProducts = async (prisma) => {
  return prisma.product.findMany({
    orderBy: { name: "asc" },
  });
};

export const getProduct = async (prisma, id) => {
  const product = await prisma.product.findUnique({ where: { id } });

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  return product;
};
