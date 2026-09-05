import {
  createQuotation,
  getQuotation,
<<<<<<< HEAD
=======
  listQuotations,
  updateQuotation,
  sendQuotation,
>>>>>>> ae6d6e7f00f8e851438f6837c024c7a9822cb5d3
} from "../services/quotationService.js";

export const createQuotationController = (prismaClient) => ({
  create: async (req, res, next) => {
<<<<<<< HEAD
    const { customerId, items, taxPercent } = req.body || {};

    if (!customerId || typeof customerId !== "string") {
      return res.status(400).json({
        success: false,
        error: "customerId is required",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one item is required",
      });
    }

    try {
      const quotation = await createQuotation(prismaClient, {
        customerId,
        salespersonId: req.user.id,
        items,
        taxPercent,
      });

      return res.status(201).json({ success: true, data: quotation });
    } catch (error) {
      return next(error);
    }
  },

  getById: async (req, res, next) => {
    try {
      const quotation = await getQuotation(prismaClient, req.params.id);
      return res.json({ success: true, data: quotation });
    } catch (error) {
      return next(error);
=======
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
>>>>>>> ae6d6e7f00f8e851438f6837c024c7a9822cb5d3
    }
  },
});
