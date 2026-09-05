import { Router } from "express";
import { createCustomerController } from "../controllers/customerController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

export const createCustomerRouter = (prismaClient) => {
  const router = Router();
  const controller = createCustomerController(prismaClient);

  router.use(requireAuth());

  router.get("/:id", controller.getById);

  return router;
};
