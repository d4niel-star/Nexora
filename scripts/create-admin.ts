/**
 * Create Admin User Script
 * 
 * Creates a fully operational admin account with:
 * - Verified email
 * - Active store
 * - Active subscription (bypasses onboarding)
 * 
 * Usage: npx tsx scripts/create-admin.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { scryptSync, randomBytes } from "crypto";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL not set in .env");
  process.exit(1);
}

const isRemote = !connectionString.includes("localhost") && !connectionString.includes("127.0.0.1");
const url = isRemote && !connectionString.includes("sslmode=")
  ? `${connectionString}${connectionString.includes("?") ? "&" : "?"}sslmode=no-verify`
  : connectionString;

const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

const ADMIN_EMAIL = "admin@nexora.com";
const ADMIN_PASSWORD = "nexora123";
const STORE_NAME = "Nexora Admin";
const STORE_SLUG = "nexora-admin";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

async function main() {
  console.log("\n🔧 Creating admin account...\n");

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  
  if (existingUser) {
    console.log(`⚠️  User ${ADMIN_EMAIL} already exists. Resetting password and ensuring access...`);
    
    // Update password and ensure verified
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { 
        password: hashPassword(ADMIN_PASSWORD),
        emailVerified: true,
      },
    });

    // Ensure store exists
    if (existingUser.storeId) {
      // Ensure subscription exists
      const sub = await prisma.storeSubscription.findUnique({ where: { storeId: existingUser.storeId } });
      if (!sub) {
        await createSubscription(existingUser.storeId);
      }
      
      // Ensure store is active
      await prisma.store.update({
        where: { id: existingUser.storeId },
        data: { status: "active" },
      });
    }

    // Clear old sessions
    await prisma.session.deleteMany({ where: { userId: existingUser.id } });

    console.log(`\n✅ Admin account reset successfully!`);
    console.log(`   Email:    ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   URL:      http://localhost:3000/home/login\n`);

    await prisma.$disconnect();
    return;
  }

  // Check if store slug exists
  const existingStore = await prisma.store.findUnique({ where: { slug: STORE_SLUG } });
  let storeId: string;

  if (existingStore) {
    storeId = existingStore.id;
    await prisma.store.update({
      where: { id: storeId },
      data: { status: "active" },
    });
    console.log(`  ↳ Using existing store: ${existingStore.name} (${STORE_SLUG})`);
  } else {
    const store = await prisma.store.create({
      data: {
        slug: STORE_SLUG,
        name: STORE_NAME,
        status: "active",
        currency: "ARS",
      },
    });
    storeId = store.id;
    console.log(`  ↳ Store created: ${STORE_NAME} (${STORE_SLUG})`);
  }

  // Create user
  const user = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      password: hashPassword(ADMIN_PASSWORD),
      name: "Admin",
      emailVerified: true,
      storeId,
    },
  });
  console.log(`  ↳ User created: ${ADMIN_EMAIL}`);

  // Create subscription
  await createSubscription(storeId);

  // Create onboarding record (mark as completed)
  const existingOnboarding = await prisma.storeOnboarding.findUnique({ where: { storeId } });
  if (!existingOnboarding) {
    await prisma.storeOnboarding.create({
      data: {
        storeId,
        currentStage: "completed",
        completedStepsJson: JSON.stringify(["welcome", "products", "branding", "payments", "launch"]),
        activationScore: 100,
        hasPublished: true,
      },
    });
    console.log(`  ↳ Onboarding marked as completed`);
  }

  console.log(`\n✅ Admin account created successfully!`);
  console.log(`   Email:    ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log(`   Store:    ${STORE_NAME} (/${STORE_SLUG})`);
  console.log(`   URL:      http://localhost:3000/home/login\n`);

  await prisma.$disconnect();
}

async function createSubscription(storeId: string) {
  // Ensure plans exist
  const plans = await prisma.plan.findMany();
  let planId: string;

  if (plans.length === 0) {
    // Seed a basic plan
    const plan = await prisma.plan.create({
      data: {
        code: "growth",
        name: "Growth",
        monthlyPrice: 0,
        configJson: JSON.stringify({
          maxProducts: 9999,
          maxCollections: 100,
          aiCredits: 500,
          features: ["ai_builder", "visual_editor", "analytics", "automations", "custom_domain"],
        }),
      },
    });
    planId = plan.id;
    console.log(`  ↳ Plan seeded: Growth`);
  } else {
    // Use the best plan available
    const growth = plans.find((p) => p.code === "growth") ?? plans[0];
    planId = growth.id;
  }

  const existingSub = await prisma.storeSubscription.findUnique({ where: { storeId } });
  if (!existingSub) {
    await prisma.storeSubscription.create({
      data: {
        storeId,
        planId,
        status: "active",
      },
    });
    console.log(`  ↳ Subscription created (active)`);
  } else {
    await prisma.storeSubscription.update({
      where: { storeId },
      data: { status: "active" },
    });
    console.log(`  ↳ Subscription activated`);
  }
}

main().catch((err) => {
  console.error("❌ Error:", err);
  prisma.$disconnect();
  process.exit(1);
});
