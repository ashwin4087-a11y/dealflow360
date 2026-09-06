import { Router } from "express";
import { createApprovalController } from "../controllers/approvalController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

const APPROVAL_ROLES = ["ADMIN", "SALES", "SALESPERSON", "MANAGER", "FINANCE", "OPERATIONS"];

export const createApprovalRouter = (prismaClient) => {
  const router = Router();
  const controller = createApprovalController(prismaClient);
  const authorize = [requireAuth(), requireRole(...APPROVAL_ROLES)];

  router.get("/", ...authorize, controller.list);
  router.get("/rules", ...authorize, controller.getRules);
  router.post("/rules", ...authorize, controller.saveRules);
  router.get("/:id", requireAuth(), controller.get);
  router.post("/:id/approve", ...authorize, controller.approve);
  router.post("/:id/reject", ...authorize, controller.reject);
  return router;
};
