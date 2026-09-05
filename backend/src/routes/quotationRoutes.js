import { Router } from "express";
import { createQuotationController } from "../controllers/quotationController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

const INTERNAL_ROLES = ["ADMIN", "SALES", "MANAGER", "FINANCE", "OPERATIONS"];

export const createQuotationRouter = (prismaClient) => {
  const router = Router();
  const controller = createQuotationController(prismaClient);
  const authorize = [requireAuth(), requireRole(...INTERNAL_ROLES)];

  router.post("/", ...authorize, controller.create);
  router.get("/", ...authorize, controller.list);
  router.get("/:id", ...authorize, controller.get);
  router.put("/:id", ...authorize, controller.update);
  return router;
};
