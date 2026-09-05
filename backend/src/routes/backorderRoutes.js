import { Router } from "express";
import { createBackorderController } from "../controllers/backorderController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { INTERNAL_ROLES } from "../services/backorderService.js";

export const createBackorderRouter = (prismaClient) => {
  const router = Router();
  const controller = createBackorderController(prismaClient);
  const authorize = [requireAuth(), requireRole(...INTERNAL_ROLES)];

  router.get("/orders/:orderId", ...authorize, controller.byOrder);
  router.get("/order-items/:orderItemId", ...authorize, controller.byOrderItem);
  router.get("/eligible", ...authorize, controller.eligible);
  router.get("/:id", ...authorize, controller.byId);
  router.post("/:id/fulfill", ...authorize, controller.fulfill);
  router.post("/:id/cancel", ...authorize, controller.cancel);
  return router;
};