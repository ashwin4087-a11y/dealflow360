import { convertQuotationToOrder } from "../services/orderService.js";

export const createOrderController = (prismaClient) => ({
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
