import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const models = [
  "user", "customer", "product", "priceList", "priceListItem",
  "discountRule", "approvalRule", "quotation", "quotationItem",
  "approvalRequest", "order", "orderItem", "warehouse", "warehouseStock",
  "allocation", "fulfillment", "backorder", "invoice", "invoiceItem",
  "invoicePayment", "subscription", "subscriptionPayment",
];

console.log("\n📊 DealFlow360 — Database Record Counts\n");
for (const m of models) {
  const count = await prisma[m].count();
  console.log(`  ${m}: ${count}`);
}
console.log("");
await prisma.$disconnect();
