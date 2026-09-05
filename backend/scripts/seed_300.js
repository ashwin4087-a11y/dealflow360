import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL ?? "postgresql://localhost:5432/dealflow360";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const IDS = {
  userSales: "seed-user-sales",
  custABC: "seed-cust-abc",
  prodLaptop: "seed-prod-laptop",
  whMain: "seed-wh-main",
};

async function main() {
  console.log("Seeding 300 records of data...");

  const totalRecords = 300;
  
  // Make sure we have the required base entities
  const salesperson = await prisma.user.findUnique({ where: { id: IDS.userSales } });
  const customer = await prisma.customer.findUnique({ where: { id: IDS.custABC } });
  const product = await prisma.product.findUnique({ where: { id: IDS.prodLaptop } });
  const warehouse = await prisma.warehouse.findUnique({ where: { id: IDS.whMain } });

  if (!salesperson || !customer || !product || !warehouse) {
    console.error("Base entities not found. Please run the main seed script first.");
    return;
  }

  const basePrice = Number(product.basePrice);

  for (let i = 1; i <= totalRecords; i++) {
    const isConverted = i <= 150; // First 150 are converted to orders
    const quantity = Math.floor(Math.random() * 10) + 1;
    const subtotal = quantity * basePrice;
    const taxAmount = subtotal * 0.18;
    const total = subtotal + taxAmount;

    // Create Quotation
    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber: `QT-BULK-${i.toString().padStart(4, '0')}`,
        customerId: customer.id,
        salespersonId: salesperson.id,
        status: isConverted ? "CONVERTED" : "DRAFT",
        subtotal: subtotal,
        discountPercent: 0,
        discountAmount: 0,
        taxPercent: 18,
        taxAmount: taxAmount,
        total: total,
        marginAmount: subtotal * 0.3,
        items: {
          create: [{
            productId: product.id,
            quantity: quantity,
            unitPrice: basePrice,
            discountPercent: 0,
            discountAmount: 0,
            lineTotal: subtotal
          }]
        }
      },
      include: { items: true }
    });

    if (isConverted) {
      // Create Order
      const order = await prisma.order.create({
        data: {
          orderNumber: `ORD-BULK-${i.toString().padStart(4, '0')}`,
          quotationId: quotation.id,
          items: {
            create: [{
              quotationItemId: quotation.items[0].id,
              productId: product.id,
              quantity: quantity,
              unitPrice: basePrice,
              lineTotal: subtotal
            }]
          }
        },
        include: { items: true }
      });

      // Create Allocation and Fulfillment for the Order
      const allocation = await prisma.allocation.create({
        data: {
          orderItemId: order.items[0].id,
          warehouseId: warehouse.id,
          allocatedQuantity: quantity
        }
      });

      await prisma.fulfillment.create({
        data: {
          allocationId: allocation.id,
          fulfilledQuantity: i % 2 === 0 ? quantity : 0, // Half fulfilled, half allocated
          status: i % 2 === 0 ? "FULFILLED" : "ALLOCATED"
        }
      });

      // Create Invoice
      await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-BULK-${i.toString().padStart(4, '0')}`,
          customerId: customer.id,
          orderId: order.id,
          amount: subtotal,
          tax: taxAmount,
          total: total,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          status: i % 3 === 0 ? "PAID" : "PENDING",
          items: {
            create: [{
              name: product.name,
              amount: subtotal
            }]
          }
        }
      });

      // Optionally create some Backorders and Subscriptions
      if (i % 10 === 0) {
        await prisma.backorder.create({
          data: {
            orderId: order.id,
            orderItemId: order.items[0].id,
            productId: product.id,
            requiredQuantity: 2,
            remainingQuantity: 2,
            status: "BACKORDERED"
          }
        });
      }

      if (i % 20 === 0) {
        await prisma.subscription.create({
          data: {
            subscriptionNumber: `SUB-BULK-${i.toString().padStart(4, '0')}`,
            customerId: customer.id,
            productId: product.id,
            billingCycle: "MONTHLY",
            amount: 50,
            nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            status: "ACTIVE"
          }
        });
      }
    }
    
    if (i % 50 === 0) {
      console.log(`Processed ${i} records...`);
    }
  }

  console.log("Successfully seeded 300 records.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
