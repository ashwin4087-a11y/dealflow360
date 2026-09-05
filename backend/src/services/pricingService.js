import { getProduct } from "./productService.js";

export const getProductPrice = async (prismaClient, productId) => {
  const product = await getProduct(prismaClient, productId);
  if (product.active !== true) {
    const error = new Error("Inactive products are not available for sale");
    error.statusCode = 400;
    throw error;
  }
  return product.basePrice;
};
