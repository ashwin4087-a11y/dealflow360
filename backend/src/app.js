import express from "express";
import cors from "cors";
import { createAuthRouter } from "./routes/authRoutes.js";
import { createProductRouter } from "./routes/productRoutes.js";
import { createCustomerRouter } from "./routes/customerRoutes.js";
import { createQuotationRouter } from "./routes/quotationRoutes.js";

export const createApp = (prismaClient) => {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({
      success: true,
      service: "dealflow360-backend",
      status: "healthy",
    });
  });

  app.get("/api", (_req, res) => {
    res.json({ name: "DealFlow360 API", version: "1.0.0" });
  });

  app.use("/api/auth", createAuthRouter(prismaClient));
  app.use("/api/products", createProductRouter(prismaClient));
  app.use("/api/customers", createCustomerRouter(prismaClient));
  app.use("/api/quotations", createQuotationRouter(prismaClient));

  app.use((error, _req, res, _next) => {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: statusCode === 500 ? "Internal server error" : error.message,
    });
  });

  return app;
};
