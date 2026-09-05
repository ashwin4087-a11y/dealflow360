import { convertQuotationToOrder } from "../services/orderService.js";
import { listOrders } from "../services/orderService.js";

export const createOrderController = (prismaClient) => ({
  list: async (_req, res, next) => {
    try {
      res.json({ success: true, data: await listOrders(prismaClient) });
    } catch (error) {
      next(error);
    }
  },

  convertQuotation: async (req, res, next) => {
    try {
      res.json({
        success: true,
        data: await convertQuotationToOrder(prismaClient, req.params.id),
      });
    } catch (error) {
      next(error);
    }
  },
});
