import {
  listCustomerQuotations,
  getCustomerQuotation,
  acceptQuotation,
  rejectQuotation,
} from "../services/customerQuotationService.js";

export const createCustomerQuotationController = (prismaClient) => ({
  list: async (req, res, next) => {
    try {
      res.json({
        success: true,
        data: await listCustomerQuotations(prismaClient, req.user.id),
      });
    } catch (error) {
      next(error);
    }
  },
  get: async (req, res, next) => {
    try {
      res.json({
        success: true,
        data: await getCustomerQuotation(prismaClient, req.user.id, req.params.id),
      });
    } catch (error) {
      next(error);
    }
  },
  accept: async (req, res, next) => {
    try {
      res.json({
        success: true,
        data: await acceptQuotation(prismaClient, req.user.id, req.params.id),
      });
    } catch (error) {
      next(error);
    }
  },
  reject: async (req, res, next) => {
    try {
      const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
      res.json({
        success: true,
        data: await rejectQuotation(prismaClient, req.user.id, req.params.id, reason),
      });
    } catch (error) {
      next(error);
    }
  },
});
