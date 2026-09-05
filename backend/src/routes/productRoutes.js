import { Router } from "express";
import { createProductController } from "../controllers/productController.js";
<<<<<<< HEAD
import { requireAuth } from "../middleware/authMiddleware.js";
=======
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

const INTERNAL_ROLES = ["ADMIN", "SALES", "MANAGER", "FINANCE", "OPERATIONS"];
>>>>>>> ae6d6e7f00f8e851438f6837c024c7a9822cb5d3

export const createProductRouter = (prismaClient) => {
  const router = Router();
  const controller = createProductController(prismaClient);
<<<<<<< HEAD

  router.use(requireAuth());

  router.get("/", controller.list);
  router.get("/:id", controller.getById);

=======
  const authorize = [requireAuth(), requireRole(...INTERNAL_ROLES)];

  router.get("/", ...authorize, controller.list);
  router.post("/", ...authorize, controller.create);
  router.get("/:id", ...authorize, controller.get);
  router.put("/:id", ...authorize, controller.update);
>>>>>>> ae6d6e7f00f8e851438f6837c024c7a9822cb5d3
  return router;
};
