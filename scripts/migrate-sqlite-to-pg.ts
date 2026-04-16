/**
 * ═══════════════════════════════════════════════════════════════
 *  Nexora: SQLite → PostgreSQL Data Migration
 * ═══════════════════════════════════════════════════════════════
 *
 * Reads ALL data from a SQLite database (the previous Nexora dev.db)
 * and inserts it into a PostgreSQL database (the new production target).
 *
 * PREREQUISITES:
 *   1. PostgreSQL database must exist and be accessible via DATABASE_URL
 *   2. Tables must already be created: run `npx prisma db push` FIRST
 *   3. SQLite source file must exist at SQLITE_PATH
 *
 * USAGE:
 *   SQLITE_PATH=./dev.db DATABASE_URL=postgresql://... npx tsx scripts/migrate-sqlite-to-pg.ts
 *
 * ENV VARS:
 *   SQLITE_PATH   — Path to SQLite file (default: ./dev.db)
 *   DATABASE_URL   — PostgreSQL connection string (required)
 *
 * FEATURES:
 *   - Migrates ALL 47 Nexora tables in correct FK dependency order
 *   - Converts SQLite booleans (0/1) to PostgreSQL booleans (true/false)
 *   - Idempotent: uses ON CONFLICT DO NOTHING (safe to re-run)
 *   - Skips tables that don't exist in source (new tables added post-SQLite)
 *   - Reports per-table counts for validation
 *   - Exits with code 1 if any errors occurred
 */

import "dotenv/config";
import Database from "better-sqlite3";
import pg from "pg";

const { Client } = pg;

// ── Config ──

const SQLITE_PATH = process.env.SQLITE_PATH || "./dev.db";
const PG_URL = process.env.DATABASE_URL;

if (!PG_URL) {
  console.error("❌ DATABASE_URL is not set. Export it or add to .env");
  process.exit(1);
}

// ── Migration order: respects foreign key dependencies ──
// Each batch only references tables from previous batches.

const MIGRATION_BATCHES: string[][] = [
  // Batch 0 — No FK dependencies
  [
    "Store",
    "Plan",
    "SourcingProvider",
    "CarrierWebhookLog",
    "SystemEvent",
    "AIUsageLog",
  ],

  // Batch 1 — Depends on: Store, Plan, SourcingProvider
  [
    "User",
    "StoreDomain",
    "StoreBranding",
    "StoreTheme",
    "StoreNavigation",
    "StorePage",
    "StoreBlock",
    "StorePublishSnapshot",
    "Product",
    "Collection",
    "Cart",
    "ShippingMethod",
    "EmailLog",
    "AIGenerationDraft",
    "AIConversation",
    "StoreSubscription",
    "BillingTransaction",
    "StoreCreditBalance",
    "CreditTransaction",
    "ProviderProduct",
    "ProviderConnection",
    "ChannelConnection",
    "StoreOnboarding",
    "StoreLegalSettings",
    "WithdrawalRequest",
    "FiscalProfile",
    "AdPlatformConnection",
    "AdRecommendation",
  ],

  // Batch 2 — Depends on: User, Product, Collection, Cart, etc.
  [
    "Session",
    "EmailVerificationToken",
    "ProductImage",
    "ProductVariant",
    "CollectionProduct",
    "CheckoutDraft",
    "Order",
    "AIGenerationProposal",
    "AIMessage",
    "ChannelListing",
    "ProviderSyncJob",
    "AdCampaignDraft",
    "AdInsightSnapshot",
  ],

  // Batch 3 — Depends on: Order, ProductVariant, ProviderConnection, etc.
  [
    "CartItem",
    "OrderItem",
    "Payment",
    "StockMovement",
    "ExternalChannelOrder",
    "SupplierOrder",
    "FiscalInvoice",
    "CatalogMirrorProduct",
    "AdCampaignProduct",
  ],

  // Batch 4 — Depends on: ExternalChannelOrder, SupplierOrder
  [
    "ExternalChannelOrderItem",
    "SupplierOrderItem",
  ],
];

// ── Boolean columns per table ──
// SQLite stores booleans as INTEGER 0/1. PostgreSQL needs actual booleans.

const BOOLEAN_COLUMNS: Record<string, string[]> = {
  User: ["emailVerified"],
  StoreDomain: ["isPrimary"],
  StoreTheme: ["isPublished"],
  StoreNavigation: ["isVisible"],
  StoreBlock: ["isVisible"],
  Product: ["isFeatured", "isPublished"],
  ProductVariant: ["trackInventory", "allowBackorder", "isDefault"],
  Collection: ["isFeatured", "isPublished"],
  ShippingMethod: ["isActive", "isDefault"],
  StoreOnboarding: [
    "hasUsedAI",
    "hasImportedProduct",
    "hasPublished",
    "hasConnectedOAuth",
  ],
  StoreLegalSettings: ["btnWithdrawalActive"],
};

// ── Value conversion ──

function convertValue(table: string, column: string, value: unknown): unknown {
  if (value === null || value === undefined) return null;

  // Boolean conversion
  const boolCols = BOOLEAN_COLUMNS[table];
  if (boolCols && boolCols.includes(column)) {
    return value === 1 || value === true;
  }

  return value;
}

// ── Single table migration ──

interface MigrateResult {
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
}

async function migrateTable(
  sqlite: Database.Database,
  pgClient: pg.Client,
  table: string,
): Promise<MigrateResult> {
  // Check if table exists in SQLite
  const tableExists = sqlite
    .prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
    )
    .get(table);

  if (!tableExists) {
    console.log(`  ⏭️  ${table}: not in SQLite (new table, skipping)`);
    return { total: 0, migrated: 0, skipped: 0, errors: 0 };
  }

  const rows = sqlite.prepare(`SELECT * FROM "${table}"`).all() as Record<string, unknown>[];

  if (rows.length === 0) {
    console.log(`  ⏭️  ${table}: 0 rows (empty)`);
    return { total: 0, migrated: 0, skipped: 0, errors: 0 };
  }

  const columns = Object.keys(rows[0]);
  const columnList = columns.map((c) => `"${c}"`).join(", ");
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");

  // ON CONFLICT DO NOTHING makes this idempotent
  const insertSQL = `INSERT INTO "${table}" (${columnList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

  let migrated = 0;
  let errors = 0;

  for (const row of rows) {
    const values = columns.map((col) => convertValue(table, col, row[col]));
    try {
      const result = await pgClient.query(insertSQL, values);
      if (result.rowCount && result.rowCount > 0) {
        migrated++;
      }
    } catch (err: any) {
      errors++;
      if (errors <= 3) {
        console.error(`    ❌ ${table} insert error: ${err.message.slice(0, 120)}`);
      } else if (errors === 4) {
        console.error(`    ❌ ${table}: suppressing further error details...`);
      }
    }
  }

  const skipped = rows.length - migrated - errors;
  const parts: string[] = [`${migrated}/${rows.length} migrated`];
  if (skipped > 0) parts.push(`${skipped} already existed`);
  if (errors > 0) parts.push(`${errors} errors`);

  const icon = errors > 0 ? "⚠️" : "✅";
  console.log(`  ${icon}  ${table}: ${parts.join(" · ")}`);

  return { total: rows.length, migrated, skipped, errors };
}

// ── Validation: compare row counts ──

async function validateCounts(
  sqlite: Database.Database,
  pgClient: pg.Client,
): Promise<void> {
  console.log("\n── Validation: Row Count Comparison ──\n");

  const allTables = MIGRATION_BATCHES.flat();
  let mismatches = 0;

  for (const table of allTables) {
    // SQLite count
    const tableExists = sqlite
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      )
      .get(table);

    if (!tableExists) continue;

    const sqliteCount = (
      sqlite.prepare(`SELECT COUNT(*) as c FROM "${table}"`).get() as any
    ).c;

    // PostgreSQL count
    let pgCount = 0;
    try {
      const res = await pgClient.query(
        `SELECT COUNT(*) as c FROM "${table}"`,
      );
      pgCount = parseInt(res.rows[0].c, 10);
    } catch {
      console.log(`  ❌ ${table}: table missing in PostgreSQL`);
      mismatches++;
      continue;
    }

    if (sqliteCount === pgCount) {
      console.log(`  ✅ ${table}: ${pgCount} rows (match)`);
    } else {
      console.log(
        `  ⚠️  ${table}: SQLite=${sqliteCount} PostgreSQL=${pgCount} (diff: ${pgCount - sqliteCount})`,
      );
      mismatches++;
    }
  }

  if (mismatches === 0) {
    console.log("\n  ✅ All table counts match perfectly.");
  } else {
    console.log(
      `\n  ⚠️  ${mismatches} table(s) have count differences. Review above.`,
    );
  }
}

// ── Main ──

async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  Nexora: SQLite → PostgreSQL Data Migration");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`  Source:  ${SQLITE_PATH}`);
  console.log(
    `  Target:  ${PG_URL!.replace(/:[^:@]+@/, ":***@")}`,
  ); // Mask password
  console.log("");

  // Open SQLite (read-only)
  const sqlite = new Database(SQLITE_PATH, { readonly: true });

  // Connect to PostgreSQL (SSL + keepAlive for Render external connections)
  const pgClient = new Client({
    connectionString: PG_URL,
    ssl: { rejectUnauthorized: false },
    keepAlive: true,
    connectionTimeoutMillis: 60000,
    statement_timeout: 60000,
  });
  pgClient.on("error", (err) => {
    console.error("  ⚠️  PG client error (non-fatal):", err.message);
  });
  await pgClient.connect();

  // FK checks handled by batch ordering (no superuser needed)

  const totals = { tables: 0, rows: 0, migrated: 0, errors: 0 };

  for (let batchIdx = 0; batchIdx < MIGRATION_BATCHES.length; batchIdx++) {
    console.log(`\n── Batch ${batchIdx} ──`);

    for (const table of MIGRATION_BATCHES[batchIdx]) {
      const result = await migrateTable(sqlite, pgClient, table);
      totals.tables++;
      totals.rows += result.total;
      totals.migrated += result.migrated;
      totals.errors += result.errors;
    }
  }

  // FK ordering ensured by batch sequence

  // Validation
  await validateCounts(sqlite, pgClient);

  // Close connections
  sqlite.close();
  await pgClient.end();

  // Summary
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  Migration Summary");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`  Tables processed:  ${totals.tables}`);
  console.log(`  Total rows read:   ${totals.rows}`);
  console.log(`  Rows migrated:     ${totals.migrated}`);
  console.log(
    `  Rows skipped:      ${totals.rows - totals.migrated - totals.errors} (already existed)`,
  );
  console.log(`  Errors:            ${totals.errors}`);
  console.log("");

  if (totals.errors > 0) {
    console.log("⚠️  Some rows failed. Review errors above.");
    process.exit(1);
  } else {
    console.log("✅ Migration completed successfully.");
  }
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
