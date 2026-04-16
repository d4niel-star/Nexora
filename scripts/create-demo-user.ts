/**
 * One-time script: Create a demo user for the existing seeded store.
 * Run with: npx tsx scripts/create-demo-user.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { scryptSync, randomBytes } from "crypto";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

async function main() {
  // Find the existing store
  const store = await prisma.store.findFirst({ orderBy: { createdAt: "asc" } });
  if (!store) {
    console.error("❌ No store found. Run prisma seed first.");
    process.exit(1);
  }

  // Check if user already exists
  const existing = await (prisma as any).user.findUnique({ where: { email: "admin@nexora.com" } });
  if (existing) {
    console.log("⚠️  User admin@nexora.com already exists. Updating password...");
    await (prisma as any).user.update({
      where: { email: "admin@nexora.com" },
      data: { password: hashPassword("nexora123"), storeId: store.id },
    });
    console.log("✓ Password updated.");
  } else {
    await (prisma as any).user.create({
      data: {
        email: "admin@nexora.com",
        password: hashPassword("nexora123"),
        name: "Admin Nexora",
        storeId: store.id,
      },
    });
    console.log("✓ User created: admin@nexora.com / nexora123");
  }

  console.log(`  Linked to store: ${store.name} (${store.id})`);
}

main()
  .catch((e) => { console.error("❌", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
