import { Router } from "express";
import { createQuotationController } from "../controllers/quotationController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

export const createQuotationRouter = (prismaClient) => {
  const router = Router();
  const controller = createQuotationController(prismaClient);

  router.use(requireAuth());

  router.post("/", requireRole("SALESPERSON", "ADMIN", "MANAGER"), controller.create);
  router.get("/:id", controller.getById);

  return router;
};
