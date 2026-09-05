import {
  createQuotation,
  getQuotation,
} from "../services/quotationService.js";

export const createQuotationController = (prismaClient) => ({
  create: async (req, res, next) => {
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
    }
  },
});
