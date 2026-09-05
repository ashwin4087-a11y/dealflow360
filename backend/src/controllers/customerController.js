import { getCustomer } from "../services/customerService.js";

export const createCustomerController = (prismaClient) => ({
  getById: async (req, res, next) => {
    try {
      const customer = await getCustomer(prismaClient, req.params.id);
      return res.json({ success: true, data: customer });
    } catch (error) {
      return next(error);
    }
  },
});
