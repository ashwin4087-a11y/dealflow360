/**
 * DealFlow360 — Comprehensive Development Seed Script
 *
 * Populates the PostgreSQL database with realistic demo data for all modules.
 * Idempotent — safe to run multiple times (uses upsert with deterministic IDs).
 *
 * Usage:  npx prisma db seed
 *    or:  node prisma/seed.js
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://localhost:5432/dealflow360";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// ─── Helpers ────────────────────────────────────────────────────────────────

const DEV_PASSWORD = "dealflow360";
const HASH_ROUNDS = 4; // fast for dev

const hashPassword = (password) => bcrypt.hash(password, HASH_ROUNDS);

const log = (label, count) => console.log(`  ✓ ${label}: ${count}`);

// ─── Deterministic IDs ──────────────────────────────────────────────────────

const IDS = {
  // Users
  userAdmin: "seed-user-admin",
  userSales: "seed-user-sales",
  userManager: "seed-user-manager",
  userFinance: "seed-user-finance",
  userCustomer: "seed-user-customer",

  // Customers
  custABC: "seed-cust-abc",
  custXYZ: "seed-cust-xyz",
  custPQR: "seed-cust-pqr",
  custTechNova: "seed-cust-technova",
  custGreenField: "seed-cust-greenfield",

  // Products
  prodLaptop: "seed-prod-laptop",
  prodMonitor: "seed-prod-monitor",
  prodServer: "seed-prod-server",
  prodKeyboard: "seed-prod-keyboard",
  prodMouse: "seed-prod-mouse",
  prodCloud: "seed-prod-cloud",

  // Price Lists
  plStandard: "seed-pl-standard",
  plEnterprise: "seed-pl-enterprise",

  // Warehouses
  whMain: "seed-wh-main",
  whEast: "seed-wh-east",
  whWest: "seed-wh-west",

  // Quotations
  quotDraft: "seed-quot-draft",
  quotApproved: "seed-quot-approved",
  quotConverted1: "seed-quot-converted1",
  quotConverted2: "seed-quot-converted2",
  quotPending: "seed-quot-pending",

  // Quotation Items
  qi1: "seed-qi-1",
  qi2: "seed-qi-2",
  qi3: "seed-qi-3",
  qi4: "seed-qi-4",
  qi5: "seed-qi-5",
  qi6: "seed-qi-6",
  qi7: "seed-qi-7",
  qi8: "seed-qi-8",
  qi9: "seed-qi-9",
  qi10: "seed-qi-10",

  // Orders
  order1: "seed-order-1",
  order2: "seed-order-2",

  // Order Items
  oi1: "seed-oi-1",
  oi2: "seed-oi-2",
  oi3: "seed-oi-3",
  oi4: "seed-oi-4",

  // Allocations
  alloc1: "seed-alloc-1",
  alloc2: "seed-alloc-2",
  alloc3: "seed-alloc-3",

  // Fulfillments
  ful1: "seed-ful-1",
  ful2: "seed-ful-2",

  // Backorders
  bo1: "seed-bo-1",
  bo2: "seed-bo-2",

  // Invoices
  inv1: "seed-inv-1",
  inv2: "seed-inv-2",
  inv3: "seed-inv-3",

  // Invoice Items
  invItem1a: "seed-invitem-1a",
  invItem1b: "seed-invitem-1b",
  invItem2a: "seed-invitem-2a",
  invItem2b: "seed-invitem-2b",
  invItem3a: "seed-invitem-3a",
  invItem3b: "seed-invitem-3b",

  // Invoice Payments
  invPay1: "seed-invpay-1",

  // Subscriptions
  sub1: "seed-sub-1",
  sub2: "seed-sub-2",

  // Subscription Payments
  subPay1: "seed-subpay-1",
  subPay2: "seed-subpay-2",

  // Approval Rules
  arManager: "seed-ar-manager",
  arFinance: "seed-ar-finance",

  // Discount Rules
  drStdHardware: "seed-dr-std-hw",
  drStdSoftware: "seed-dr-std-sw",
  drStdAccessories: "seed-dr-std-acc",
  drPremHardware: "seed-dr-prem-hw",
  drPremSoftware: "seed-dr-prem-sw",
  drPremAccessories: "seed-dr-prem-acc",

  // Approval Requests
  apr1: "seed-apr-1",
  apr2: "seed-apr-2",
};

// ─── 1. USERS ───────────────────────────────────────────────────────────────

async function seedUsers() {
  const passwordHash = await hashPassword(DEV_PASSWORD);

  const users = [
    {
      id: IDS.userAdmin,
      name: "Admin User",
      email: "admin@dealflow360.com",
      role: "ADMIN",
      passwordHash,
    },
    {
      id: IDS.userSales,
      name: "Rahul Sharma",
      email: "sales@dealflow360.com",
      role: "SALESPERSON",
      passwordHash,
    },
    {
      id: IDS.userManager,
      name: "Priya Patel",
      email: "manager@dealflow360.com",
      role: "MANAGER",
      passwordHash,
    },
    {
      id: IDS.userFinance,
      name: "Amit Verma",
      email: "finance@dealflow360.com",
      role: "FINANCE",
      passwordHash,
    },
    {
      id: IDS.userCustomer,
      name: "Vikram Singh",
      email: "customer@dealflow360.com",
      role: "CUSTOMER",
      passwordHash,
      customerId: IDS.custABC,
    },
  ];

  // Upsert customer-linked user LAST (needs customer to exist). Seed
  // customers first, then upsert users. For now, skip customerId on initial
  // creation — we will link it after customers are seeded.

  for (const user of users) {
    const { customerId, ...data } = user;
    await prisma.user.upsert({
      where: { email: data.email },
      update: { passwordHash: data.passwordHash, name: data.name, role: data.role },
      create: data,
    });
  }

  log("Users", users.length);
  return users;
}

// ─── 2. CUSTOMERS ───────────────────────────────────────────────────────────

async function seedCustomers() {
  const customers = [
    {
      id: IDS.custABC,
      name: "ABC Technologies",
      email: "procurement@abctech.in",
      phone: "+91-9876543210",
      company: "ABC Technologies Pvt Ltd",
      customerTier: "PREMIUM",
      billingAddress: "123 MG Road, Bengaluru 560001",
      shippingAddress: "123 MG Road, Bengaluru 560001",
    },
    {
      id: IDS.custXYZ,
      name: "XYZ Industries",
      email: "orders@xyzind.in",
      phone: "+91-9876543211",
      company: "XYZ Industries Ltd",
      customerTier: "STANDARD",
      billingAddress: "45 Nehru Place, New Delhi 110019",
      shippingAddress: "Plot 12, Industrial Area, Gurgaon 122001",
    },
    {
      id: IDS.custPQR,
      name: "PQR Systems",
      email: "it@pqrsystems.com",
      phone: "+91-9876543212",
      company: "PQR Systems International",
      customerTier: "PREMIUM",
      billingAddress: "78 Hinjawadi IT Park, Pune 411057",
      shippingAddress: "78 Hinjawadi IT Park, Pune 411057",
    },
    {
      id: IDS.custTechNova,
      name: "TechNova Solutions",
      email: "sales@technova.co",
      phone: "+91-9876543213",
      company: "TechNova Solutions Pvt Ltd",
      customerTier: "STANDARD",
      billingAddress: "22 Anna Salai, Chennai 600002",
      shippingAddress: "22 Anna Salai, Chennai 600002",
    },
    {
      id: IDS.custGreenField,
      name: "GreenField Corp",
      email: "admin@greenfield.in",
      phone: "+91-9876543214",
      company: "GreenField Corporation",
      customerTier: "STANDARD",
      billingAddress: "56 Salt Lake, Kolkata 700091",
      shippingAddress: "56 Salt Lake, Kolkata 700091",
    },
  ];

  for (const c of customers) {
    await prisma.customer.upsert({
      where: { id: c.id },
      update: {
        name: c.name,
        email: c.email,
        phone: c.phone,
        company: c.company,
        customerTier: c.customerTier,
        billingAddress: c.billingAddress,
        shippingAddress: c.shippingAddress,
      },
      create: c,
    });
  }

  // Link customer user now that customer exists
  await prisma.user.update({
    where: { email: "customer@dealflow360.com" },
    data: { customerId: IDS.custABC },
  });

  log("Customers", customers.length);
}

// ─── 3. PRODUCTS ────────────────────────────────────────────────────────────

async function seedProducts() {
  const products = [
    {
      id: IDS.prodLaptop,
      name: "Laptop Pro",
      sku: "LAP-PRO-001",
      basePrice: "75000.00",
      category: "Hardware",
      description: "High-performance business laptop with 16GB RAM and 512GB SSD",
      productType: "ONE_TIME",
      active: true,
    },
    {
      id: IDS.prodMonitor,
      name: "Monitor Pro",
      sku: "MON-PRO-001",
      basePrice: "25000.00",
      category: "Hardware",
      description: "27-inch 4K IPS display with USB-C connectivity",
      productType: "ONE_TIME",
      active: true,
    },
    {
      id: IDS.prodServer,
      name: "Server Unit",
      sku: "SRV-UNT-001",
      basePrice: "150000.00",
      category: "Hardware",
      description: "Enterprise rack server with dual Xeon processors",
      productType: "ONE_TIME",
      active: true,
    },
    {
      id: IDS.prodKeyboard,
      name: "Keyboard Pro",
      sku: "KBD-PRO-001",
      basePrice: "3500.00",
      category: "Accessories",
      description: "Mechanical wireless keyboard with backlit keys",
      productType: "ONE_TIME",
      active: true,
    },
    {
      id: IDS.prodMouse,
      name: "Mouse Pro",
      sku: "MOU-PRO-001",
      basePrice: "2500.00",
      category: "Accessories",
      description: "Ergonomic wireless mouse with multi-device support",
      productType: "ONE_TIME",
      active: true,
    },
    {
      id: IDS.prodCloud,
      name: "Cloud Software Suite",
      sku: "CLD-SFT-001",
      basePrice: "10000.00",
      category: "Software",
      description: "Monthly cloud-based productivity and collaboration platform",
      productType: "RECURRING",
      active: true,
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        name: p.name,
        basePrice: p.basePrice,
        category: p.category,
        description: p.description,
        productType: p.productType,
        active: p.active,
      },
      create: p,
    });
  }

  log("Products", products.length);
}

// ─── 4. PRICE LISTS ─────────────────────────────────────────────────────────

async function seedPriceLists() {
  const priceLists = [
    { id: IDS.plStandard, name: "Standard Price List", currency: "INR", active: true },
    { id: IDS.plEnterprise, name: "Enterprise Price List", currency: "INR", active: true },
  ];

  for (const pl of priceLists) {
    await prisma.priceList.upsert({
      where: { id: pl.id },
      update: { name: pl.name, currency: pl.currency, active: pl.active },
      create: pl,
    });
  }

  const productIds = [
    IDS.prodLaptop,
    IDS.prodMonitor,
    IDS.prodServer,
    IDS.prodKeyboard,
    IDS.prodMouse,
    IDS.prodCloud,
  ];
  const standardPrices = ["75000.00", "25000.00", "150000.00", "3500.00", "2500.00", "10000.00"];
  const enterprisePrices = ["68000.00", "22000.00", "135000.00", "3000.00", "2200.00", "8500.00"];

  let itemCount = 0;
  for (let i = 0; i < productIds.length; i++) {
    // Standard
    await prisma.priceListItem.upsert({
      where: {
        priceListId_productId: {
          priceListId: IDS.plStandard,
          productId: productIds[i],
        },
      },
      update: { price: standardPrices[i] },
      create: {
        priceListId: IDS.plStandard,
        productId: productIds[i],
        price: standardPrices[i],
      },
    });
    itemCount++;
    // Enterprise
    await prisma.priceListItem.upsert({
      where: {
        priceListId_productId: {
          priceListId: IDS.plEnterprise,
          productId: productIds[i],
        },
      },
      update: { price: enterprisePrices[i] },
      create: {
        priceListId: IDS.plEnterprise,
        productId: productIds[i],
        price: enterprisePrices[i],
      },
    });
    itemCount++;
  }

  log("PriceLists", priceLists.length);
  log("PriceListItems", itemCount);
}

// ─── 5. DISCOUNT RULES ──────────────────────────────────────────────────────

async function seedDiscountRules() {
  const rules = [
    { id: IDS.drStdHardware, customerTier: "STANDARD", productCategory: "Hardware", maxDiscountPercent: "10.00" },
    { id: IDS.drStdSoftware, customerTier: "STANDARD", productCategory: "Software", maxDiscountPercent: "5.00" },
    { id: IDS.drStdAccessories, customerTier: "STANDARD", productCategory: "Accessories", maxDiscountPercent: "15.00" },
    { id: IDS.drPremHardware, customerTier: "PREMIUM", productCategory: "Hardware", maxDiscountPercent: "20.00" },
    { id: IDS.drPremSoftware, customerTier: "PREMIUM", productCategory: "Software", maxDiscountPercent: "10.00" },
    { id: IDS.drPremAccessories, customerTier: "PREMIUM", productCategory: "Accessories", maxDiscountPercent: "25.00" },
  ];

  for (const r of rules) {
    await prisma.discountRule.upsert({
      where: {
        customerTier_productCategory: {
          customerTier: r.customerTier,
          productCategory: r.productCategory,
        },
      },
      update: { maxDiscountPercent: r.maxDiscountPercent, active: true },
      create: { ...r, active: true },
    });
  }

  log("DiscountRules", rules.length);
}

// ─── 6. APPROVAL RULES ──────────────────────────────────────────────────────

async function seedApprovalRules() {
  const rules = [
    {
      id: IDS.arManager,
      name: "Manager Approval (>10% blended discount)",
      minBlendedDiscountPercent: "10.00",
      requiresLineViolation: false,
      requiresManager: true,
      requiresFinance: false,
      active: true,
      priority: 1,
    },
    {
      id: IDS.arFinance,
      name: "Finance Approval (>20% blended discount)",
      minBlendedDiscountPercent: "20.00",
      requiresLineViolation: false,
      requiresManager: true,
      requiresFinance: true,
      active: true,
      priority: 2,
    },
  ];

  for (const r of rules) {
    await prisma.approvalRule.upsert({
      where: { id: r.id },
      update: {
        name: r.name,
        minBlendedDiscountPercent: r.minBlendedDiscountPercent,
        requiresLineViolation: r.requiresLineViolation,
        requiresManager: r.requiresManager,
        requiresFinance: r.requiresFinance,
        active: r.active,
        priority: r.priority,
      },
      create: r,
    });
  }

  log("ApprovalRules", rules.length);
}

// ─── 7. WAREHOUSES ──────────────────────────────────────────────────────────

async function seedWarehouses() {
  const warehouses = [
    { id: IDS.whMain, name: "Main Warehouse", code: "WH-MAIN", location: "Bengaluru, Karnataka", active: true },
    { id: IDS.whEast, name: "East Warehouse", code: "WH-EAST", location: "Kolkata, West Bengal", active: true },
    { id: IDS.whWest, name: "West Warehouse", code: "WH-WEST", location: "Mumbai, Maharashtra", active: true },
  ];

  for (const w of warehouses) {
    await prisma.warehouse.upsert({
      where: { code: w.code },
      update: { name: w.name, location: w.location, active: w.active },
      create: w,
    });
  }

  log("Warehouses", warehouses.length);
}

// ─── 8. WAREHOUSE STOCK ──────────────────────────────────────────────────────

async function seedWarehouseStock() {
  const physicalProducts = [
    IDS.prodLaptop,
    IDS.prodMonitor,
    IDS.prodServer,
    IDS.prodKeyboard,
    IDS.prodMouse,
  ];
  const warehouses = [IDS.whMain, IDS.whEast, IDS.whWest];
  const quantities = [
    // Laptop, Monitor, Server, Keyboard, Mouse
    ["120.00", "200.00", "30.00", "500.00", "400.00"],  // Main
    ["60.00", "100.00", "15.00", "300.00", "250.00"],   // East
    ["80.00", "150.00", "20.00", "200.00", "300.00"],   // West
  ];

  let count = 0;
  for (let wi = 0; wi < warehouses.length; wi++) {
    for (let pi = 0; pi < physicalProducts.length; pi++) {
      await prisma.warehouseStock.upsert({
        where: {
          warehouseId_productId: {
            warehouseId: warehouses[wi],
            productId: physicalProducts[pi],
          },
        },
        update: { availableQuantity: quantities[wi][pi] },
        create: {
          warehouseId: warehouses[wi],
          productId: physicalProducts[pi],
          availableQuantity: quantities[wi][pi],
        },
      });
      count++;
    }
  }

  log("WarehouseStock", count);
}

// ─── 9. QUOTATIONS & ITEMS ──────────────────────────────────────────────────

async function seedQuotations() {
  // We build quotations directly (bypassing the service calculation layer)
  // since this is seed data with pre-computed financials.

  const quotations = [
    {
      id: IDS.quotDraft,
      quotationNumber: "Q-SEED-001",
      customerId: IDS.custTechNova,
      salespersonId: IDS.userSales,
      status: "DRAFT",
      subtotal: "175000.00",
      discountPercent: "0.00",
      discountAmount: "0.00",
      taxPercent: "18.00",
      taxAmount: "31500.00",
      total: "206500.00",
      marginAmount: "0.00",
    },
    {
      id: IDS.quotApproved,
      quotationNumber: "Q-SEED-002",
      customerId: IDS.custGreenField,
      salespersonId: IDS.userSales,
      status: "APPROVED",
      subtotal: "300000.00",
      discountPercent: "0.00",
      discountAmount: "0.00",
      taxPercent: "18.00",
      taxAmount: "54000.00",
      total: "354000.00",
      marginAmount: "0.00",
    },
    {
      id: IDS.quotConverted1,
      quotationNumber: "Q-SEED-003",
      customerId: IDS.custABC,
      salespersonId: IDS.userSales,
      status: "CONVERTED",
      subtotal: "580000.00",
      discountPercent: "0.00",
      discountAmount: "0.00",
      taxPercent: "18.00",
      taxAmount: "104400.00",
      total: "684400.00",
      marginAmount: "0.00",
    },
    {
      id: IDS.quotConverted2,
      quotationNumber: "Q-SEED-004",
      customerId: IDS.custXYZ,
      salespersonId: IDS.userSales,
      status: "CONVERTED",
      subtotal: "240000.00",
      discountPercent: "0.00",
      discountAmount: "0.00",
      taxPercent: "18.00",
      taxAmount: "43200.00",
      total: "283200.00",
      marginAmount: "0.00",
    },
    {
      id: IDS.quotPending,
      quotationNumber: "Q-SEED-005",
      customerId: IDS.custPQR,
      salespersonId: IDS.userSales,
      status: "PENDING_APPROVAL",
      subtotal: "1500000.00",
      discountPercent: "0.00",
      discountAmount: "225000.00",
      taxPercent: "18.00",
      taxAmount: "229500.00",
      total: "1504500.00",
      marginAmount: "0.00",
    },
  ];

  for (const q of quotations) {
    await prisma.quotation.upsert({
      where: { quotationNumber: q.quotationNumber },
      update: {
        status: q.status,
        subtotal: q.subtotal,
        discountPercent: q.discountPercent,
        discountAmount: q.discountAmount,
        taxPercent: q.taxPercent,
        taxAmount: q.taxAmount,
        total: q.total,
        marginAmount: q.marginAmount,
      },
      create: q,
    });
  }

  // Quotation items
  const items = [
    // Q-SEED-001 (DRAFT) — Laptop Pro × 2 + Keyboard × 5
    { id: IDS.qi1, quotationId: IDS.quotDraft, productId: IDS.prodLaptop, quantity: "2.00", unitPrice: "75000.00", discountPercent: "0.00", discountAmount: "0.00", lineTotal: "150000.00" },
    { id: IDS.qi2, quotationId: IDS.quotDraft, productId: IDS.prodKeyboard, quantity: "5.00", unitPrice: "3500.00", discountPercent: "0.00", discountAmount: "0.00", lineTotal: "17500.00" },
    // Additional laptop to balance — was 175000 total with items above being 167500. Let's adjust: 150000 + 25000 = 175000
    { id: IDS.qi3, quotationId: IDS.quotDraft, productId: IDS.prodMonitor, quantity: "1.00", unitPrice: "25000.00", discountPercent: "0.00", discountAmount: "0.00", lineTotal: "25000.00" },

    // Q-SEED-002 (APPROVED) — Server × 2
    { id: IDS.qi4, quotationId: IDS.quotApproved, productId: IDS.prodServer, quantity: "2.00", unitPrice: "150000.00", discountPercent: "0.00", discountAmount: "0.00", lineTotal: "300000.00" },

    // Q-SEED-003 (CONVERTED → Order 1) — Laptop × 5 + Monitor × 10 + Cloud × 1
    { id: IDS.qi5, quotationId: IDS.quotConverted1, productId: IDS.prodLaptop, quantity: "5.00", unitPrice: "75000.00", discountPercent: "0.00", discountAmount: "0.00", lineTotal: "375000.00" },
    { id: IDS.qi6, quotationId: IDS.quotConverted1, productId: IDS.prodMonitor, quantity: "5.00", unitPrice: "25000.00", discountPercent: "0.00", discountAmount: "0.00", lineTotal: "125000.00" },
    { id: IDS.qi7, quotationId: IDS.quotConverted1, productId: IDS.prodCloud, quantity: "8.00", unitPrice: "10000.00", discountPercent: "0.00", discountAmount: "0.00", lineTotal: "80000.00" },

    // Q-SEED-004 (CONVERTED → Order 2) — Laptop × 2 + Server × 1
    { id: IDS.qi8, quotationId: IDS.quotConverted2, productId: IDS.prodLaptop, quantity: "2.00", unitPrice: "75000.00", discountPercent: "0.00", discountAmount: "0.00", lineTotal: "150000.00" },
    { id: IDS.qi9, quotationId: IDS.quotConverted2, productId: IDS.prodMouse, quantity: "20.00", unitPrice: "2500.00", discountPercent: "0.00", discountAmount: "0.00", lineTotal: "50000.00" },

    // Q-SEED-005 (PENDING_APPROVAL) — Server × 10
    { id: IDS.qi10, quotationId: IDS.quotPending, productId: IDS.prodServer, quantity: "10.00", unitPrice: "150000.00", discountPercent: "15.00", discountAmount: "225000.00", lineTotal: "1275000.00" },
  ];

  for (const item of items) {
    await prisma.quotationItem.upsert({
      where: { id: item.id },
      update: {
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent,
        discountAmount: item.discountAmount,
        lineTotal: item.lineTotal,
      },
      create: item,
    });
  }

  log("Quotations", quotations.length);
  log("QuotationItems", items.length);
}

// ─── 10. APPROVAL REQUESTS ──────────────────────────────────────────────────

async function seedApprovalRequests() {
  const requests = [
    {
      id: IDS.apr1,
      quotationId: IDS.quotPending,
      requestedById: IDS.userSales,
      approverId: IDS.userManager,
      approvalRole: "MANAGER",
      reason: "Blended discount of 15% exceeds 10% threshold — manager approval required",
      status: "PENDING",
    },
    {
      id: IDS.apr2,
      quotationId: IDS.quotPending,
      requestedById: IDS.userSales,
      approverId: IDS.userFinance,
      approvalRole: "FINANCE",
      reason: "Blended discount of 15% exceeds 10% threshold — finance review requested",
      status: "PENDING",
    },
  ];

  for (const r of requests) {
    await prisma.approvalRequest.upsert({
      where: {
        quotationId_approvalRole: {
          quotationId: r.quotationId,
          approvalRole: r.approvalRole,
        },
      },
      update: {
        status: r.status,
        reason: r.reason,
        approverId: r.approverId,
      },
      create: r,
    });
  }

  log("ApprovalRequests", requests.length);
}

// ─── 11. ORDERS ──────────────────────────────────────────────────────────────

async function seedOrders() {
  const orders = [
    { id: IDS.order1, orderNumber: "ORD-SEED-001", quotationId: IDS.quotConverted1 },
    { id: IDS.order2, orderNumber: "ORD-SEED-002", quotationId: IDS.quotConverted2 },
  ];

  for (const o of orders) {
    await prisma.order.upsert({
      where: { orderNumber: o.orderNumber },
      update: {},
      create: o,
    });
  }

  // Order items — must link to quotation items
  const orderItems = [
    // Order 1 (ABC Technologies)
    { id: IDS.oi1, orderId: IDS.order1, quotationItemId: IDS.qi5, productId: IDS.prodLaptop, quantity: 5, unitPrice: "75000.00", lineTotal: "375000.00" },
    { id: IDS.oi2, orderId: IDS.order1, quotationItemId: IDS.qi6, productId: IDS.prodMonitor, quantity: 5, unitPrice: "25000.00", lineTotal: "125000.00" },
    // Order 2 (XYZ Industries)
    { id: IDS.oi3, orderId: IDS.order2, quotationItemId: IDS.qi8, productId: IDS.prodLaptop, quantity: 2, unitPrice: "75000.00", lineTotal: "150000.00" },
    { id: IDS.oi4, orderId: IDS.order2, quotationItemId: IDS.qi9, productId: IDS.prodMouse, quantity: 20, unitPrice: "2500.00", lineTotal: "50000.00" },
  ];

  for (const oi of orderItems) {
    await prisma.orderItem.upsert({
      where: { quotationItemId: oi.quotationItemId },
      update: {
        quantity: oi.quantity,
        unitPrice: oi.unitPrice,
        lineTotal: oi.lineTotal,
      },
      create: oi,
    });
  }

  log("Orders", orders.length);
  log("OrderItems", orderItems.length);
}

// ─── 12. ALLOCATIONS ─────────────────────────────────────────────────────────

async function seedAllocations() {
  const allocations = [
    // Order 1 items allocated from Main warehouse
    { id: IDS.alloc1, orderItemId: IDS.oi1, warehouseId: IDS.whMain, allocatedQuantity: "5.00" },
    { id: IDS.alloc2, orderItemId: IDS.oi2, warehouseId: IDS.whMain, allocatedQuantity: "3.00" },
    // Order 2, oi3 allocated from East warehouse
    { id: IDS.alloc3, orderItemId: IDS.oi3, warehouseId: IDS.whEast, allocatedQuantity: "2.00" },
  ];

  for (const a of allocations) {
    await prisma.allocation.upsert({
      where: {
        orderItemId_warehouseId: {
          orderItemId: a.orderItemId,
          warehouseId: a.warehouseId,
        },
      },
      update: { allocatedQuantity: a.allocatedQuantity },
      create: a,
    });
  }

  log("Allocations", allocations.length);
}

// ─── 13. FULFILLMENTS ────────────────────────────────────────────────────────

async function seedFulfillments() {
  const fulfillments = [
    { id: IDS.ful1, allocationId: IDS.alloc1, fulfilledQuantity: "5.00", status: "FULFILLED" },
    { id: IDS.ful2, allocationId: IDS.alloc2, fulfilledQuantity: "0.00", status: "ALLOCATED" },
  ];

  for (const f of fulfillments) {
    await prisma.fulfillment.upsert({
      where: { allocationId: f.allocationId },
      update: { fulfilledQuantity: f.fulfilledQuantity, status: f.status },
      create: f,
    });
  }

  log("Fulfillments", fulfillments.length);
}

// ─── 14. BACKORDERS ──────────────────────────────────────────────────────────

async function seedBackorders() {
  const backorders = [
    {
      id: IDS.bo1,
      orderId: IDS.order1,
      orderItemId: IDS.oi2,
      productId: IDS.prodMonitor,
      requiredQuantity: "2.00",
      fulfilledQuantity: "0.00",
      remainingQuantity: "2.00",
      status: "BACKORDERED",
    },
    {
      id: IDS.bo2,
      orderId: IDS.order2,
      orderItemId: IDS.oi4,
      productId: IDS.prodMouse,
      requiredQuantity: "20.00",
      fulfilledQuantity: "0.00",
      remainingQuantity: "20.00",
      status: "READY_TO_FULFILL",
    },
  ];

  for (const b of backorders) {
    await prisma.backorder.upsert({
      where: { id: b.id },
      update: {
        requiredQuantity: b.requiredQuantity,
        fulfilledQuantity: b.fulfilledQuantity,
        remainingQuantity: b.remainingQuantity,
        status: b.status,
      },
      create: b,
    });
  }

  log("Backorders", backorders.length);
}

// ─── 15. INVOICES ────────────────────────────────────────────────────────────

async function seedInvoices() {
  const now = new Date();
  const invoices = [
    {
      id: IDS.inv1,
      invoiceNumber: "INV-SEED-001",
      customerId: IDS.custABC,
      orderId: IDS.order1,
      amount: "580000.00",
      tax: "104400.00",
      total: "684400.00",
      issueDate: new Date(now.getFullYear(), now.getMonth(), 1),
      dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      status: "PAID",
    },
    {
      id: IDS.inv2,
      invoiceNumber: "INV-SEED-002",
      customerId: IDS.custXYZ,
      orderId: IDS.order2,
      amount: "240000.00",
      tax: "43200.00",
      total: "283200.00",
      issueDate: new Date(now.getFullYear(), now.getMonth(), 3),
      dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 3),
      status: "PENDING",
    },
    {
      id: IDS.inv3,
      invoiceNumber: "INV-SEED-003",
      customerId: IDS.custPQR,
      orderId: null,
      amount: "150000.00",
      tax: "27000.00",
      total: "177000.00",
      issueDate: new Date(now.getFullYear(), now.getMonth() - 1, 15),
      dueDate: new Date(now.getFullYear(), now.getMonth(), 1),
      status: "OVERDUE",
    },
  ];

  for (const inv of invoices) {
    const { orderId, ...createData } = inv;
    const createPayload = orderId ? { ...createData, orderId } : createData;
    await prisma.invoice.upsert({
      where: { invoiceNumber: inv.invoiceNumber },
      update: {
        amount: inv.amount,
        tax: inv.tax,
        total: inv.total,
        status: inv.status,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
      },
      create: createPayload,
    });
  }

  // Invoice Items
  const invoiceItems = [
    { id: IDS.invItem1a, invoiceId: IDS.inv1, name: "Laptop Pro × 5", amount: "375000.00" },
    { id: IDS.invItem1b, invoiceId: IDS.inv1, name: "Monitor Pro × 5", amount: "125000.00" },
    { id: IDS.invItem2a, invoiceId: IDS.inv2, name: "Laptop Pro × 2", amount: "150000.00" },
    { id: IDS.invItem2b, invoiceId: IDS.inv2, name: "Mouse Pro × 20", amount: "50000.00" },
    { id: IDS.invItem3a, invoiceId: IDS.inv3, name: "Server Unit × 1", amount: "150000.00" },
    { id: IDS.invItem3b, invoiceId: IDS.inv3, name: "Maintenance Plan", amount: "0.00" },
  ];

  for (const item of invoiceItems) {
    await prisma.invoiceItem.upsert({
      where: { id: item.id },
      update: { name: item.name, amount: item.amount },
      create: item,
    });
  }

  // Invoice Payments (for the PAID invoice)
  const payments = [
    {
      id: IDS.invPay1,
      invoiceId: IDS.inv1,
      date: new Date(now.getFullYear(), now.getMonth(), 5),
      method: "Bank Transfer",
      status: "Paid",
      amount: "684400.00",
    },
  ];

  for (const p of payments) {
    await prisma.invoicePayment.upsert({
      where: { id: p.id },
      update: { amount: p.amount, method: p.method, status: p.status },
      create: p,
    });
  }

  log("Invoices", invoices.length);
  log("InvoiceItems", invoiceItems.length);
  log("InvoicePayments", payments.length);
}

// ─── 16. SUBSCRIPTIONS ──────────────────────────────────────────────────────

async function seedSubscriptions() {
  const now = new Date();

  const subscriptions = [
    {
      id: IDS.sub1,
      subscriptionNumber: "SUB-SEED-001",
      customerId: IDS.custABC,
      productId: IDS.prodCloud,
      billingCycle: "MONTHLY",
      amount: "10000.00",
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      nextBillingDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      status: "ACTIVE",
    },
    {
      id: IDS.sub2,
      subscriptionNumber: "SUB-SEED-002",
      customerId: IDS.custXYZ,
      productId: IDS.prodCloud,
      billingCycle: "YEARLY",
      amount: "108000.00",
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      nextBillingDate: new Date(now.getFullYear() + 1, now.getMonth(), 1),
      status: "ACTIVE",
    },
  ];

  for (const s of subscriptions) {
    await prisma.subscription.upsert({
      where: { subscriptionNumber: s.subscriptionNumber },
      update: {
        amount: s.amount,
        billingCycle: s.billingCycle,
        status: s.status,
        nextBillingDate: s.nextBillingDate,
      },
      create: s,
    });
  }

  // Subscription Payments
  const subPayments = [
    {
      id: IDS.subPay1,
      subscriptionId: IDS.sub1,
      invoiceId: IDS.inv1,
      date: new Date(now.getFullYear(), now.getMonth(), 5),
      amount: "10000.00",
    },
    {
      id: IDS.subPay2,
      subscriptionId: IDS.sub2,
      invoiceId: IDS.inv2,
      date: new Date(now.getFullYear(), now.getMonth(), 5),
      amount: "108000.00",
    },
  ];

  for (const sp of subPayments) {
    await prisma.subscriptionPayment.upsert({
      where: { id: sp.id },
      update: { amount: sp.amount },
      create: sp,
    });
  }

  log("Subscriptions", subscriptions.length);
  log("SubscriptionPayments", subPayments.length);
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🌱 DealFlow360 — Seeding development database...\n");

  await seedUsers();
  await seedCustomers();
  await seedProducts();
  await seedPriceLists();
  await seedDiscountRules();
  await seedApprovalRules();
  await seedWarehouses();
  await seedWarehouseStock();
  await seedQuotations();
  await seedApprovalRequests();
  await seedOrders();
  await seedAllocations();
  await seedFulfillments();
  await seedBackorders();
  await seedInvoices();
  await seedSubscriptions();

  console.log("\n✅ Seeding complete!\n");
  console.log("Development credentials:");
  console.log("  admin@dealflow360.com    / dealflow360  (ADMIN)");
  console.log("  sales@dealflow360.com    / dealflow360  (SALESPERSON)");
  console.log("  manager@dealflow360.com  / dealflow360  (MANAGER)");
  console.log("  finance@dealflow360.com  / dealflow360  (FINANCE)");
  console.log("  customer@dealflow360.com / dealflow360  (CUSTOMER)");
  console.log("");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
