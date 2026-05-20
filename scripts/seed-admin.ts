// ─── Nexora Admin Seed (external Render connection) ───
// Run: npx tsx scripts/seed-admin.ts
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import pg from "pg";
import { scryptSync, randomBytes } from "crypto";

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

  let connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL not found");
    process.exit(1);
  }

  // Force external hostname for Render
  connectionString = connectionString.replace("-a.oregon", "-a.external.oregon");

  console.log("🔧 Nexora Admin Seed\n");

  // Use Pool with explicit ssl config
  const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    const client = await pool.connect();
    console.log("✅ Connected to database\n");

    // Check if user exists
    const existingUser = await client.query(
      'SELECT id, email, "emailVerified", "storeId" FROM "User" WHERE email = $1',
      [EMAIL],
    );

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      console.log(`⚠️  User ${EMAIL} already exists (id: ${user.id})`);
      await client.query(
        'UPDATE "User" SET "emailVerified" = true, password = $1 WHERE id = $2',
        [hashPassword(PASSWORD), user.id],
      );
      console.log("   ✅ Password reset + email verified");
      console.log(`\n🔑 Email:    ${EMAIL}`);
      console.log(`   Password: ${PASSWORD}`);
      client.release();
      return;
    }

    // Check store
    const existingStore = await client.query(
      'SELECT id, name FROM "Store" WHERE slug = $1',
      [STORE_SLUG],
    );

    let storeId: string;
    if (existingStore.rows.length > 0) {
      storeId = existingStore.rows[0].id;
      console.log(`ℹ️  Store exists (id: ${storeId})`);
    } else {
      const storeResult = await client.query(
        `INSERT INTO "Store" (id, slug, name, status, currency, locale, description, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, 'active', 'ARS', 'es-AR', $3, NOW(), NOW())
         RETURNING id`,
        [STORE_SLUG, STORE_NAME, "Tienda demo de Nexora con acceso completo."],
      );
      storeId = storeResult.rows[0].id;
      console.log(`✅ Store created (id: ${storeId})`);

      await client.query(
        `INSERT INTO "StoreOnboarding" (id, "storeId", "currentStage", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, 'completed', NOW(), NOW())`,
        [storeId],
      );
    }

    // Create user
    const userResult = await client.query(
      `INSERT INTO "User" (id, email, password, name, "emailVerified", "storeId", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, true, $4, NOW(), NOW())
       RETURNING id`,
      [EMAIL, hashPassword(PASSWORD), "Admin", storeId],
    );
    const userId = userResult.rows[0].id;
    console.log(`✅ User created (id: ${userId})`);

    await client.query('UPDATE "Store" SET "ownerId" = $1 WHERE id = $2', [userId, storeId]);
    console.log(`✅ Store ownership linked`);

    console.log(`\n🔑 Email:    ${EMAIL}`);
    console.log(`   Password: ${PASSWORD}`);

    client.release();
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
