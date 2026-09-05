import { Router } from "express";
import { createOrderController } from "../controllers/orderController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

const INTERNAL_ROLES = ["ADMIN", "SALES", "SALESPERSON", "MANAGER", "FINANCE", "OPERATIONS"];

export const createOrderRouter = (prismaClient) => {
  const router = Router();
  const controller = createOrderController(prismaClient);
  const authorize = [requireAuth(), requireRole(...INTERNAL_ROLES)];

  router.get("/", ...authorize, controller.list);

  return router;
};
