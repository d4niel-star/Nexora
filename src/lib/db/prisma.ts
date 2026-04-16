import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  // Render and other hosted PostgreSQL require SSL for external connections
  const isRemote = !connectionString.includes("localhost") && !connectionString.includes("127.0.0.1");
  const url = isRemote && !connectionString.includes("sslmode=")
    ? `${connectionString}${connectionString.includes("?") ? "&" : "?"}sslmode=require`
    : connectionString;

  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
