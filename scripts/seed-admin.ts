// ─── Nexora Admin Seed ───
// Creates an admin user with full access to test the platform.
// Run: npx tsx --env-file=.env.local scripts/seed-admin.ts
//
// Credentials:
//   Email:    admin@nexora.dev
//   Password: Nexora2026!

import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { scryptSync, randomBytes } from "crypto";

function createPrisma() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set — run with --env-file=.env.local");

  const isRemote = !connectionString.includes("localhost") && !connectionString.includes("127.0.0.1");
  const url = isRemote && !connectionString.includes("sslmode=")
    ? `${connectionString}${connectionString.includes("?") ? "&" : "?"}sslmode=require`
    : connectionString;

  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

const prisma = createPrisma();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

async function main() {
  const EMAIL = "admin@nexora.dev";
  const PASSWORD = "Nexora2026!";
  const STORE_NAME = "Nexora Demo Store";
  const STORE_SLUG = "nexora-demo";

  console.log("🔧 Nexora Admin Seed\n");

  // Check if user already exists
  const existing = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (existing) {
    console.log(`⚠️  User ${EMAIL} already exists (id: ${existing.id})`);
    console.log(`   Store ID: ${existing.storeId ?? "none"}`);
    console.log(`   Email verified: ${existing.emailVerified}`);

    // Ensure verified
    if (!existing.emailVerified) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { emailVerified: true },
      });
      console.log("   ✅ Marked as email verified");
    }

    console.log(`\n🔑 Login credentials:`);
    console.log(`   Email:    ${EMAIL}`);
    console.log(`   Password: ${PASSWORD}`);
    console.log(`   URL:      http://localhost:3000/home/login`);
    return;
  }

  // Check if store slug exists
  let store = await prisma.store.findUnique({ where: { slug: STORE_SLUG } });

  if (!store) {
    store = await prisma.store.create({
      data: {
        slug: STORE_SLUG,
        name: STORE_NAME,
        status: "active",
        currency: "ARS",
        locale: "es-AR",
        description: "Tienda demo de Nexora con acceso completo para testing.",
        onboarding: {
          create: {
            currentStage: "completed",
          },
        },
      },
    });
    console.log(`✅ Store created: "${STORE_NAME}" (slug: ${STORE_SLUG})`);
  } else {
    console.log(`ℹ️  Store "${store.name}" already exists (slug: ${STORE_SLUG})`);
  }

  // Create user
  const user = await prisma.user.create({
    data: {
      email: EMAIL,
      password: hashPassword(PASSWORD),
      name: "Admin",
      emailVerified: true,
      storeId: store.id,
    },
  });

  // Link store ownership
  await prisma.store.update({
    where: { id: store.id },
    data: { ownerId: user.id },
  });

  console.log(`✅ Admin user created (id: ${user.id})`);
  console.log(`✅ Linked to store: ${store.name}`);

  console.log(`\n🔑 Login credentials:`);
  console.log(`   Email:    ${EMAIL}`);
  console.log(`   Password: ${PASSWORD}`);
  console.log(`   URL:      http://localhost:3000/home/login`);
  console.log(`\n📦 Admin panel: http://localhost:3000/admin/dashboard`);
  console.log(`🛍️  Storefront:  http://localhost:3000/store/${STORE_SLUG}`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
