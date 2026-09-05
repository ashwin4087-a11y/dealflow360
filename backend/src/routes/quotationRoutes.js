import { Router } from "express";
import { createQuotationController } from "../controllers/quotationController.js";
<<<<<<< HEAD
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

export const createQuotationRouter = (prismaClient) => {
  const router = Router();
  const controller = createQuotationController(prismaClient);

  router.use(requireAuth());

  router.post("/", requireRole("SALESPERSON", "ADMIN", "MANAGER"), controller.create);
  router.get("/:id", controller.getById);

=======
import { createOrderController } from "../controllers/orderController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

const INTERNAL_ROLES = ["ADMIN", "SALES", "MANAGER", "FINANCE", "OPERATIONS"];

export const createQuotationRouter = (prismaClient) => {
  const router = Router();
  const controller = createQuotationController(prismaClient);
  const orderController = createOrderController(prismaClient);
  const authorize = [requireAuth(), requireRole(...INTERNAL_ROLES)];

  router.post("/", ...authorize, controller.create);
  router.get("/", ...authorize, controller.list);
  router.get("/:id", ...authorize, controller.get);
  router.put("/:id", ...authorize, controller.update);
  router.post("/:id/send", ...authorize, controller.send);
  router.post("/:id/convert", ...authorize, orderController.convertQuotation);
>>>>>>> ae6d6e7f00f8e851438f6837c024c7a9822cb5d3
  return router;
};
