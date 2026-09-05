import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://localhost:5432/dealflow360";
const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });
