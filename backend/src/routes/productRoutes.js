import { Router } from "express";
import { createProductController } from "../controllers/productController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

const INTERNAL_ROLES = ["ADMIN", "SALES", "MANAGER", "FINANCE", "OPERATIONS"];

export const createProductRouter = (prismaClient) => {
  const router = Router();
  const controller = createProductController(prismaClient);
  const authorize = [requireAuth(), requireRole(...INTERNAL_ROLES)];

  router.get("/", ...authorize, controller.list);
  router.post("/", ...authorize, controller.create);
  router.get("/:id", ...authorize, controller.get);
  router.put("/:id", ...authorize, controller.update);
  return router;
};
