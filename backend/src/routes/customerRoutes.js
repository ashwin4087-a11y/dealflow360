import { Router } from "express";
import { createCustomerController } from "../controllers/customerController.js";
<<<<<<< HEAD
import { requireAuth } from "../middleware/authMiddleware.js";
=======
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

const INTERNAL_ROLES = ["ADMIN", "SALES", "MANAGER", "FINANCE", "OPERATIONS"];
>>>>>>> ae6d6e7f00f8e851438f6837c024c7a9822cb5d3

export const createCustomerRouter = (prismaClient) => {
  const router = Router();
  const controller = createCustomerController(prismaClient);
<<<<<<< HEAD

  router.use(requireAuth());

  router.get("/:id", controller.getById);
=======
  const requireCustomerManagement = [
    requireAuth(),
    requireRole(...INTERNAL_ROLES),
  ];

  router.get("/", requireCustomerManagement, controller.list);
  router.post("/", requireCustomerManagement, controller.create);
  router.get("/:id", requireCustomerManagement, controller.get);
  router.put("/:id", requireCustomerManagement, controller.update);
>>>>>>> ae6d6e7f00f8e851438f6837c024c7a9822cb5d3

  return router;
};
