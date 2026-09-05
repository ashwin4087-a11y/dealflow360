import {
  getItemAllocations,
  getOrderAllocations,
  recommendAllocation,
  replaceAllocation,
} from "../services/allocationService.js";

export const createAllocationController = (prismaClient) => ({
  recommend: async (req, res, next) => {
    try {
      res.json({ success: true, data: await recommendAllocation(prismaClient, req.params.orderItemId) });
    } catch (error) {
      next(error);
    }
  },
  replace: async (req, res, next) => {
    try {
      res.json({ success: true, data: await replaceAllocation(prismaClient, req.params.orderItemId, req.body) });
    } catch (error) {
      next(error);
    }
  },
  byOrder: async (req, res, next) => {
    try {
      res.json({ success: true, data: await getOrderAllocations(prismaClient, req.params.orderId) });
    } catch (error) {
      next(error);
    }
  },
  byItem: async (req, res, next) => {
    try {
      res.json({ success: true, data: await getItemAllocations(prismaClient, req.params.orderItemId) });
    } catch (error) {
      next(error);
    }
  },
});