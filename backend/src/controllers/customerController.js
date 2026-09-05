import {
  createCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
} from "../services/customerService.js";

export const createCustomerController = (prismaClient) => ({
  list: async (_req, res, next) => {
    try {
      res.json({ success: true, data: await listCustomers(prismaClient) });
    } catch (error) {
      next(error);
    }
  },

  create: async (req, res, next) => {
    try {
      res.status(201).json({
        success: true,
        data: await createCustomer(prismaClient, req.body),
      });
    } catch (error) {
      next(error);
    }
  },

  get: async (req, res, next) => {
    try {
      res.json({
        success: true,
        data: await getCustomer(prismaClient, req.params.id),
      });
    } catch (error) {
      next(error);
    }
  },

  update: async (req, res, next) => {
    try {
      res.json({
        success: true,
        data: await updateCustomer(prismaClient, req.params.id, req.body),
      });
    } catch (error) {
      next(error);
    }
  },
});
