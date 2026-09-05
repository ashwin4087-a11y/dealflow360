import { Router } from "express";
import { createCustomerController } from "../controllers/customerController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

const INTERNAL_ROLES = ["ADMIN", "SALES", "MANAGER", "FINANCE", "OPERATIONS"];

export const createCustomerRouter = (prismaClient) => {
  const router = Router();
  const controller = createCustomerController(prismaClient);
  const requireCustomerManagement = [
    requireAuth(),
    requireRole(...INTERNAL_ROLES),
  ];

  router.get("/", requireCustomerManagement, controller.list);
  router.post("/", requireCustomerManagement, controller.create);
  router.get("/:id", requireCustomerManagement, controller.get);
  router.put("/:id", requireCustomerManagement, controller.update);

  return router;
};
