import {
  cancelBackorder,
  fulfillBackorder,
  getBackorder,
  getBackordersForOrder,
  getBackordersForOrderItem,
  getEligibleBackorders,
} from "../services/backorderService.js";

export const createBackorderController = (prismaClient) => ({
  byOrder: async (req, res, next) => {
    try { res.json({ success: true, data: await getBackordersForOrder(prismaClient, req.params.orderId) }); } catch (error) { next(error); }
  },
  byId: async (req, res, next) => {
    try { res.json({ success: true, data: await getBackorder(prismaClient, req.params.id) }); } catch (error) { next(error); }
  },
  byOrderItem: async (req, res, next) => {
    try { res.json({ success: true, data: await getBackordersForOrderItem(prismaClient, req.params.orderItemId) }); } catch (error) { next(error); }
  },
  eligible: async (req, res, next) => {
    try { res.json({ success: true, data: await getEligibleBackorders(prismaClient, req.query.productId, req.query.warehouseId) }); } catch (error) { next(error); }
  },
  fulfill: async (req, res, next) => {
    try { res.json({ success: true, data: await fulfillBackorder(prismaClient, req.params.id, req.body) }); } catch (error) { next(error); }
  },
  cancel: async (req, res, next) => {
    try { res.json({ success: true, data: await cancelBackorder(prismaClient, req.params.id) }); } catch (error) { next(error); }
  },
});