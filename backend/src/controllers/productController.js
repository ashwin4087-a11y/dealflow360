<<<<<<< HEAD
import { listProducts, getProduct } from "../services/productService.js";
=======
import {
  createProduct,
  getProduct,
  listProducts,
  updateProduct,
} from "../services/productService.js";
>>>>>>> ae6d6e7f00f8e851438f6837c024c7a9822cb5d3

export const createProductController = (prismaClient) => ({
  list: async (_req, res, next) => {
    try {
<<<<<<< HEAD
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
=======
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
>>>>>>> ae6d6e7f00f8e851438f6837c024c7a9822cb5d3
    }
  },
});
