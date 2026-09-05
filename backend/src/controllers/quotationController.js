import {
  createQuotation,
  getQuotation,
  listQuotations,
  previewQuotation,
  updateQuotation,
  sendQuotation,
} from "../services/quotationService.js";

export const createQuotationController = (prismaClient) => ({
  create: async (req, res, next) => {
    try {
      res
        .status(201)
        .json({
          success: true,
          data: await createQuotation(prismaClient, req.user.id, req.body),
        });
    } catch (error) {
      next(error);
    }
  },
  list: async (_req, res, next) => {
    try {
      res.json({ success: true, data: await listQuotations(prismaClient) });
    } catch (error) {
      next(error);
    }
  },
  get: async (req, res, next) => {
    try {
      res.json({
        success: true,
        data: await getQuotation(prismaClient, req.params.id),
      });
    } catch (error) {
      next(error);
    }
  },
  preview: async (req, res, next) => {
    try {
      res.json({
        success: true,
        data: await previewQuotation(prismaClient, req.params.id, req.body),
      });
    } catch (error) {
      next(error);
    }
  },
  update: async (req, res, next) => {
    try {
      res.json({
        success: true,
        data: await updateQuotation(prismaClient, req.params.id, req.body),
      });
    } catch (error) {
      next(error);
    }
  },
  send: async (req, res, next) => {
    try {
      res.json({
        success: true,
        data: await sendQuotation(prismaClient, req.params.id),
      });
    } catch (error) {
      next(error);
    }
  },
});
