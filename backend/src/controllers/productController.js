import {
  createProduct,
  getProduct,
  listProducts,
  updateProduct,
} from "../services/productService.js";

export const createProductController = (prismaClient) => ({
  list: async (_req, res, next) => {
    try {
      res.json({ success: true, data: await listProducts(prismaClient) });
    } catch (error) {
      next(error);
    }
  },
  create: async (req, res, next) => {
    try {
      res.status(201).json({
        success: true,
        data: await createProduct(prismaClient, req.body),
      });
    } catch (error) {
      next(error);
    }
  },
  get: async (req, res, next) => {
    try {
      res.json({
        success: true,
        data: await getProduct(prismaClient, req.params.id),
      });
    } catch (error) {
      next(error);
    }
  },
  update: async (req, res, next) => {
    try {
      res.json({
        success: true,
        data: await updateProduct(prismaClient, req.params.id, req.body),
      });
    } catch (error) {
      next(error);
    }
  },
});
