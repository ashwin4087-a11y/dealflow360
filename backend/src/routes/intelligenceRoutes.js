import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { createIntelligenceController } from "../controllers/intelligenceController.js";

const INTERNAL_ROLES = ["ADMIN", "SALES", "SALESPERSON", "MANAGER", "FINANCE", "OPERATIONS"];
const INTELLIGENCE_ROLES = ["ADMIN", "SALES", "SALESPERSON", "MANAGER", "FINANCE", "OPERATIONS", "CUSTOMER"];

export const createIntelligenceRouter = (prismaClient) => {
  const router = Router();
  const controller = createIntelligenceController(prismaClient);
  const internal = [requireAuth(), requireRole(...INTERNAL_ROLES)];
  const intelligence = [requireAuth(), requireRole(...INTELLIGENCE_ROLES)];

  router.get("/recommendations/customer/:customerId", ...intelligence, controller.customerRecommendations);
  router.get("/recommendations/quotation/:quotationId", ...intelligence, controller.quotationRecommendations);
  router.get("/deals/health", ...intelligence, controller.health);
  router.get("/deals/:id/health", ...intelligence, controller.healthByDeal);
  router.get("/deals/rescue", ...internal, controller.rescue);
  router.get("/deals/:id/rescue", ...internal, controller.rescueByDeal);
  return router;
};
