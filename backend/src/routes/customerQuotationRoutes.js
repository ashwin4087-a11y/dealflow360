import { Router } from "express";
import { createCustomerQuotationController } from "../controllers/customerQuotationController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

export const createCustomerQuotationRouter = (prismaClient) => {
  const router = Router();
  const controller = createCustomerQuotationController(prismaClient);
  const authorize = [requireAuth(), requireRole("CUSTOMER")];

  router.get("/", ...authorize, controller.list);
  router.get("/:id", ...authorize, controller.get);
  router.post("/:id/accept", ...authorize, controller.accept);
  router.post("/:id/reject", ...authorize, controller.reject);
  
  return router;
};
