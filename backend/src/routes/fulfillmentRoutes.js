import { Router } from "express";
import { createFulfillmentController } from "../controllers/fulfillmentController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { INTERNAL_ROLES } from "../services/fulfillmentService.js";

export const createFulfillmentRouter = (prismaClient) => {
  const router = Router();
  const controller = createFulfillmentController(prismaClient);
  const authorize = [requireAuth(), requireRole(...INTERNAL_ROLES)];

  router.get("/orders/:orderId", ...authorize, controller.byOrder);
  router.get("/order-items/:orderItemId", ...authorize, controller.byItem);
  router.get("/allocations/:allocationId", ...authorize, controller.byAllocation);
  router.post("/allocations/:allocationId/confirm", ...authorize, controller.confirm);
  router.get("/records", ...authorize, controller.records);

  return router;
};