import {
  createWarehouse,
  getProductStock,
  getWarehouse,
  listInventory,
  listWarehouses,
  receiveStock,
  updateStock,
} from "../services/inventoryService.js";

export const createInventoryController = (prismaClient) => ({
  createWarehouse: async (req, res, next) => {
    try {
      res.status(201).json({
        success: true,
        data: await createWarehouse(prismaClient, req.body),
      });
    } catch (error) {
      next(error);
    }
  },
  listWarehouses: async (_req, res, next) => {
    try {
      res.json({ success: true, data: await listWarehouses(prismaClient) });
    } catch (error) {
      next(error);
    }
  },
  getWarehouse: async (req, res, next) => {
    try {
      res.json({
        success: true,
        data: await getWarehouse(prismaClient, req.params.id),
      });
    } catch (error) {
      next(error);
    }
  },
  listInventory: async (_req, res, next) => {
    try {
      res.json({ success: true, data: await listInventory(prismaClient) });
    } catch (error) {
      next(error);
    }
  },
  getProductStock: async (req, res, next) => {
    try {
      res.json({
        success: true,
        data: await getProductStock(prismaClient, req.params.productId),
      });
    } catch (error) {
      next(error);
    }
  },
  receiveStock: async (req, res, next) => {
    try {
      res.json({
        success: true,
        data: await receiveStock(prismaClient, {
          warehouseId: req.params.warehouseId,
          productId: req.body?.productId,
          quantity: req.body?.quantity,
        }),
      });
    } catch (error) {
      next(error);
    }
  },
  updateStock: async (req, res, next) => {
    try {
      res.json({
        success: true,
        data: await updateStock(prismaClient, {
          warehouseId: req.params.warehouseId,
          productId: req.body?.productId,
          quantity: req.body?.quantity,
        }),
      });
    } catch (error) {
      next(error);
    }
  },
});