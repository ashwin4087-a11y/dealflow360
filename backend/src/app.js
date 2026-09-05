import express from "express";
import cors from "cors";
import { createAuthRouter } from "./routes/authRoutes.js";
import { createProductRouter } from "./routes/productRoutes.js";
import { createCustomerRouter } from "./routes/customerRoutes.js";
import { createQuotationRouter } from "./routes/quotationRoutes.js";
import { createApprovalRouter } from "./routes/approvalRoutes.js";
import { createCustomerQuotationRouter } from "./routes/customerQuotationRoutes.js";
import { createInventoryRouter } from "./routes/inventoryRoutes.js";
import { createAllocationRouter } from "./routes/allocationRoutes.js";
import { createFulfillmentRouter } from "./routes/fulfillmentRoutes.js";
import { createBackorderRouter } from "./routes/backorderRoutes.js";
import { createNegotiationRouter } from "./routes/negotiationRoutes.js";
import { createOrderRouter } from "./routes/orderRoutes.js";
import { createIntelligenceRouter } from "./routes/intelligenceRoutes.js";
import { createInvoiceRouter } from "./routes/invoiceRoutes.js";
import { createSubscriptionRouter } from "./routes/subscriptionRoutes.js";

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
  app.use("/api/approvals", createApprovalRouter(prismaClient));
  app.use("/api/customer/quotations", createCustomerQuotationRouter(prismaClient));
  app.use("/api/inventory", createInventoryRouter(prismaClient));
  app.use("/api/allocations", createAllocationRouter(prismaClient));
  app.use("/api/fulfillment", createFulfillmentRouter(prismaClient));
  app.use("/api/backorders", createBackorderRouter(prismaClient));
  app.use("/api/orders", createOrderRouter(prismaClient));
  app.use("/api/negotiations", createNegotiationRouter(prismaClient));
  app.use("/api", createIntelligenceRouter(prismaClient));
  app.use("/api/invoices", createInvoiceRouter(prismaClient));
  app.use("/api/subscriptions", createSubscriptionRouter(prismaClient));

  app.use((error, _req, res, _next) => {
    const statusCode = error.statusCode || 500;
    if (statusCode === 500) {
      console.error(error);
    }
    res.status(statusCode).json({
      success: false,
      error: statusCode === 500 ? "Internal server error" : error.message,
    });
  });

  return app;
};
