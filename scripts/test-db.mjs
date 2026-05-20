import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const dbUrl = process.env.DATABASE_URL;
console.log("DB host:", new URL(dbUrl).hostname);
console.log("Connecting...");

const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

try {
  await client.connect();
  console.log("✅ Connected!");
  const res = await client.query("SELECT NOW()");
  console.log("  DB Time:", res.rows[0].now);
} catch (err) {
  console.error("❌ Connection failed:", err.message);
  console.error("  Full error:", err.code || err.cause || "");
} finally {
  await client.end();
}
