import { Router } from "express";
import { createNegotiationController } from "../controllers/negotiationController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

const ALL_NEGOTIATION_ROLES = ["ADMIN", "SALES", "SALESPERSON", "MANAGER", "FINANCE", "OPERATIONS", "CUSTOMER"];

export const createNegotiationRouter = (prismaClient) => {
  const router = Router();
  const controller = createNegotiationController(prismaClient);
  const authenticated = requireAuth();
  const allRoles = [authenticated, requireRole(...ALL_NEGOTIATION_ROLES)];

  router.get("/", ...allRoles, controller.list);
  router.get("/:id", ...allRoles, controller.get);
  router.post("/:id/counteroffer", authenticated, requireRole("SALESPERSON", "CUSTOMER"), controller.counteroffer);
  router.post("/:id/submit", authenticated, requireRole("ADMIN", "SALESPERSON"), controller.submit);
  router.post("/:id/approve", authenticated, requireRole("ADMIN", "MANAGER"), controller.approve);
  router.post("/:id/reject", authenticated, requireRole("ADMIN", "MANAGER"), controller.reject);
  router.post("/:id/close", authenticated, requireRole("CUSTOMER"), controller.close);
  return router;
};