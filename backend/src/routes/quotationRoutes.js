import { Router } from "express";
import { createQuotationController } from "../controllers/quotationController.js";
import { createOrderController } from "../controllers/orderController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { createNegotiationController } from "../controllers/negotiationController.js";

const INTERNAL_ROLES = ["ADMIN", "SALES", "MANAGER", "FINANCE", "OPERATIONS"];

export const createQuotationRouter = (prismaClient) => {
  const router = Router();
  const controller = createQuotationController(prismaClient);
  const orderController = createOrderController(prismaClient);
  const negotiationController = createNegotiationController(prismaClient);
  const authorize = [requireAuth(), requireRole(...INTERNAL_ROLES)];

  router.post("/", ...authorize, controller.create);
  router.get("/", ...authorize, controller.list);
  router.get("/:id", ...authorize, controller.get);
  router.put("/:id", ...authorize, controller.update);
  router.post("/:id/send", ...authorize, controller.send);
  router.post("/:id/convert", ...authorize, orderController.convertQuotation);
  router.get("/:quotationId/negotiation", requireAuth(), negotiationController.byQuotation);
  router.post("/:quotationId/negotiation", requireAuth(), requireRole("ADMIN", "SALESPERSON"), negotiationController.create);
  return router;
};
