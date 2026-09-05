import { listProducts, getProduct } from "../services/productService.js";

export const createProductController = (prismaClient) => ({
  list: async (_req, res, next) => {
    try {
      const products = await listProducts(prismaClient);
      return res.json({ success: true, data: products });
    } catch (error) {
      return next(error);
    }
  },

  getById: async (req, res, next) => {
    try {
      const product = await getProduct(prismaClient, req.params.id);
      return res.json({ success: true, data: product });
    } catch (error) {
      return next(error);
    }
  },
});
