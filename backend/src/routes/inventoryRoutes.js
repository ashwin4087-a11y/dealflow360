import { Router } from "express";
import { createInventoryController } from "../controllers/inventoryController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { INTERNAL_ROLES } from "../services/inventoryService.js";

export const createInventoryRouter = (prismaClient) => {
  const router = Router();
  const controller = createInventoryController(prismaClient);
  const authorize = [requireAuth(), requireRole(...INTERNAL_ROLES)];

  router.get("/warehouses", ...authorize, controller.listWarehouses);
  router.post("/warehouses", ...authorize, controller.createWarehouse);
  router.get("/warehouses/:id", ...authorize, controller.getWarehouse);
  router.get("/stock", ...authorize, controller.listInventory);
  router.get("/products/:productId/stock", ...authorize, controller.getProductStock);
  router.post(
    "/warehouses/:warehouseId/stock/receive",
    ...authorize,
    controller.receiveStock,
  );
  router.put("/warehouses/:warehouseId/stock", ...authorize, controller.updateStock);

  return router;
};