import { Router } from "express";
import { createAuthController } from "../controllers/authController.js";

export const createAuthRouter = (prismaClient) => {
  const router = Router();
  const controller = createAuthController(prismaClient);

  router.post("/login", controller.login);
  return router;
};
