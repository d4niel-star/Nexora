/**
 * Create a fully activated Pro user for testing all features.
 * Run with: npx tsx scripts/create-pro-user.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { scryptSync, randomBytes } from "crypto";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const isRemote = !connectionString.includes("localhost") && !connectionString.includes("127.0.0.1");
const url = isRemote && !connectionString.includes("sslmode=")
  ? `${connectionString}${connectionString.includes("?") ? "&" : "?"}sslmode=require`
  : connectionString;

const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

const EMAIL = "admin@nexora.com";
const PASSWORD = "nexora123";
const NAME = "Admin Nexora";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

const PRO_CONFIG = {
  aiCredits: 2000,
  maxProducts: 0,
  maxOrdersPerMonth: 0,
  customDomain: true,
  byokEnabled: true,
  aiStudioAdvanced: true,
  advancedCarriers: true,
  advancedBranding: true,
  maxStaff: 15,
};

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  Nexora: Create Pro User");
  console.log("═══════════════════════════════════════════\n");

  // 1. Find or confirm store
  const store = await prisma.store.findFirst({ orderBy: { createdAt: "asc" } });
  if (!store) {
    console.error("❌ No store found.");
    process.exit(1);
  }
  console.log(`✅ Store: ${store.name} (${store.id})`);

  // 2. Upsert user with emailVerified = true
  const hashedPw = hashPassword(PASSWORD);
  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: {
      password: hashedPw,
      name: NAME,
      storeId: store.id,
      emailVerified: true,
    },
    create: {
      email: EMAIL,
      password: hashedPw,
      name: NAME,
      storeId: store.id,
      emailVerified: true,
    },
  });
  console.log(`✅ User: ${EMAIL} / ${PASSWORD} (emailVerified: true)`);

  // 3. Upsert Pro plan
  const plan = await prisma.plan.upsert({
    where: { code: "pro" },
    update: {
      name: "Pro",
      monthlyPrice: 89999,
      currency: "ARS",
      configJson: JSON.stringify(PRO_CONFIG),
      sortOrder: 3,
    },
    create: {
      code: "pro",
      name: "Pro",
      monthlyPrice: 89999,
      currency: "ARS",
      configJson: JSON.stringify(PRO_CONFIG),
      sortOrder: 3,
    },
  });
  console.log(`✅ Plan: Pro (${plan.id})`);

  // 4. Upsert subscription → active Pro
  const existingSub = await prisma.storeSubscription.findUnique({ where: { storeId: store.id } });
  if (existingSub) {
    await prisma.storeSubscription.update({
      where: { storeId: store.id },
      data: { planId: plan.id, status: "active" },
    });
    console.log("✅ Subscription updated → Pro active");
  } else {
    await prisma.storeSubscription.create({
      data: {
        storeId: store.id,
        planId: plan.id,
        status: "active",
      },
    });
    console.log("✅ Subscription created → Pro active");
  }

  // 5. Upsert credit balance (2000 credits)
  const existingBalance = await prisma.storeCreditBalance.findUnique({ where: { storeId: store.id } });
  if (existingBalance) {
    await prisma.storeCreditBalance.update({
      where: { storeId: store.id },
      data: { freeCredits: PRO_CONFIG.aiCredits, paidCredits: 0, usedCredits: 0 },
    });
  } else {
    await prisma.storeCreditBalance.create({
      data: { storeId: store.id, freeCredits: PRO_CONFIG.aiCredits, paidCredits: 0, usedCredits: 0 },
    });
  }
  console.log(`✅ Credits: ${PRO_CONFIG.aiCredits} AI credits`);

  // 6. Upsert onboarding → completed
  await prisma.storeOnboarding.upsert({
    where: { storeId: store.id },
    update: { activationScore: 100, currentStage: "completed" },
    create: { storeId: store.id, activationScore: 100, currentStage: "completed" },
  });
  console.log("✅ Onboarding: completed (score 100)");

  console.log("\n═══════════════════════════════════════════");
  console.log("  Ready to login:");
  console.log(`  Email:    ${EMAIL}`);
  console.log(`  Password: ${PASSWORD}`);
  console.log(`  Plan:     Pro (all features unlocked)`);
  console.log("═══════════════════════════════════════════");
}

main()
  .catch((e) => { console.error("❌", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
