import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  // Render and other hosted PostgreSQL require SSL for external connections.
  // Node v24 treats sslmode=require as verify-full which breaks Render certs.
  // uselibpqcompat=true restores standard libpq semantics.
  const isRemote = !connectionString.includes("localhost") && !connectionString.includes("127.0.0.1");
  let url = connectionString;
  if (isRemote) {
    const sep = connectionString.includes("?") ? "&" : "?";
    if (!connectionString.includes("sslmode=")) {
      url = `${url}${sep}sslmode=require`;
    }
    if (!connectionString.includes("uselibpqcompat=")) {
      url = `${url}${url.includes("?") ? "&" : "?"}uselibpqcompat=true`;
    }
  }

  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
