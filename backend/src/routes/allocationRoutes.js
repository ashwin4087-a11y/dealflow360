import { Router } from "express";
import { createAllocationController } from "../controllers/allocationController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { INTERNAL_ROLES } from "../services/allocationService.js";

export const createAllocationRouter = (prismaClient) => {
  const router = Router();
  const controller = createAllocationController(prismaClient);
  const authorize = [requireAuth(), requireRole(...INTERNAL_ROLES)];

  router.get("/orders/:orderId", ...authorize, controller.byOrder);
  router.get("/order-items/:orderItemId", ...authorize, controller.byItem);
  router.get("/order-items/:orderItemId/recommendation", ...authorize, controller.recommend);
  router.put("/order-items/:orderItemId", ...authorize, controller.replace);

  return router;
};