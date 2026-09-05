import {
  confirmFulfillment,
  getAllocationFulfillment,
  getFulfillmentRecords,
  getOrderFulfillment,
  getOrderItemFulfillment,
} from "../services/fulfillmentService.js";

export const createFulfillmentController = (prismaClient) => ({
  byOrder: async (req, res, next) => {
    try {
      res.json({ success: true, data: await getOrderFulfillment(prismaClient, req.params.orderId) });
    } catch (error) {
      next(error);
    }
  },
  byItem: async (req, res, next) => {
    try {
      res.json({ success: true, data: await getOrderItemFulfillment(prismaClient, req.params.orderItemId) });
    } catch (error) {
      next(error);
    }
  },
  confirm: async (req, res, next) => {
    try {
      res.json({ success: true, data: await confirmFulfillment(prismaClient, req.params.allocationId, req.body) });
    } catch (error) {
      next(error);
    }
  },
  byAllocation: async (req, res, next) => {
    try {
      res.json({ success: true, data: await getAllocationFulfillment(prismaClient, req.params.allocationId) });
    } catch (error) {
      next(error);
    }
  },
  records: async (req, res, next) => {
    try {
      res.json({ success: true, data: await getFulfillmentRecords(prismaClient, req.query.orderId) });
    } catch (error) {
      next(error);
    }
  },
});