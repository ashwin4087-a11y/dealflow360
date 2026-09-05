import { Router } from "express";
import { createProductController } from "../controllers/productController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

export const createProductRouter = (prismaClient) => {
  const router = Router();
  const controller = createProductController(prismaClient);

  router.use(requireAuth());

  router.get("/", controller.list);
  router.get("/:id", controller.getById);

  return router;
};
