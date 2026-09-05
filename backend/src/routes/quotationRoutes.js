import { Router } from "express";
import { createQuotationController } from "../controllers/quotationController.js";
import { createOrderController } from "../controllers/orderController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { createNegotiationController } from "../controllers/negotiationController.js";

const INTERNAL_ROLES = ["ADMIN", "SALES", "SALESPERSON", "MANAGER", "FINANCE", "OPERATIONS"];

export const createQuotationRouter = (prismaClient) => {
  const router = Router();
  const controller = createQuotationController(prismaClient);
  const orderController = createOrderController(prismaClient);
  const negotiationController = createNegotiationController(prismaClient);
  const authorize = [requireAuth(), requireRole(...INTERNAL_ROLES)];
  const quotationEditors = [requireAuth(), requireRole("ADMIN", "SALESPERSON")];

  router.post("/", ...authorize, controller.create);
  router.get("/", ...authorize, controller.list);
  router.post("/:id/what-if", ...authorize, controller.preview);
  router.post("/:id/simulate", ...authorize, controller.preview);
  router.get("/:id", ...authorize, controller.get);
  router.put("/:id", ...quotationEditors, controller.update);
  router.post("/:id/send", ...authorize, controller.send);
  router.post("/:id/convert", ...authorize, orderController.convertQuotation);
  router.get("/:quotationId/negotiation", requireAuth(), negotiationController.byQuotation);
  router.post("/:quotationId/negotiation", requireAuth(), requireRole("ADMIN", "SALESPERSON"), negotiationController.create);
  return router;
};
