import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL ?? "postgresql://localhost:5432/dealflow360";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const companyNames = [
  "Acme Corp", "Globex Corporation", "Soylent Corp", "Initech", "Umbrella Corporation",
  "Stark Industries", "Wayne Enterprises", "Cyberdyne Systems", "Massive Dynamic", "Oscorp",
  "Hooli", "Pied Piper", "Dunder Mifflin", "Vandelay Industries", "Vehement Capital",
  "Gekko & Co", "Sterling Cooper", "Ewing Oil", "Bluth Company", "Los Pollos Hermanos"
];

const productNames = [
  "ThinkPad T14", "MacBook Pro 16", "Dell XPS 13", "iPad Pro", "Surface Pro 9",
  "Logitech MX Master 3", "Keychron K2", "AirPods Pro", "Sony WH-1000XM5", "Dell UltraSharp 27",
  "AWS EC2 instances (1yr)", "Google Workspace License", "Office 365 Enterprise", "Slack Pro Subscription", "Zoom Business Plan",
  "Cisco Meraki Router", "Ubiquiti UniFi AP", "APC UPS 1500VA", "Seagate 4TB NAS", "Samsung 980 Pro 2TB"
];

const categories = ["Hardware", "Hardware", "Hardware", "Hardware", "Hardware", 
                   "Accessories", "Accessories", "Accessories", "Accessories", "Hardware", 
                   "Software", "Software", "Software", "Software", "Software", 
                   "Networking", "Networking", "Accessories", "Storage", "Storage"];

async function main() {
  console.log("Seeding more customers and products...");

  // Seed 20 Customers
  let customersCount = 0;
  for (let i = 0; i < companyNames.length; i++) {
    const c = await prisma.customer.create({
      data: {
        name: `${companyNames[i]} Contact`,
        company: companyNames[i],
        email: `contact@${companyNames[i].toLowerCase().replace(/\s/g, '')}.com`,
        phone: `+1-555-01${i.toString().padStart(2, '0')}`,
        customerTier: i % 3 === 0 ? "ENTERPRISE" : "STANDARD",
        billingAddress: `${100 + i} Main St, Business District`,
        shippingAddress: `${100 + i} Main St, Business District`
      }
    });
    customersCount++;
  }
  
  // Seed 20 Products
  let productsCount = 0;
  for (let i = 0; i < productNames.length; i++) {
    const basePrice = Math.floor(Math.random() * 2000) + 50;
    await prisma.product.create({
      data: {
        name: productNames[i],
        sku: `SKU-${productNames[i].toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 8)}-${i}`,
        basePrice: basePrice,
        category: categories[i],
        description: `Premium ${categories[i].toLowerCase()} product for enterprise.`,
        productType: categories[i] === "Software" ? "RECURRING" : "ONE_TIME"
      }
    });
    productsCount++;
  }

  console.log(`Successfully seeded ${customersCount} customers and ${productsCount} products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
