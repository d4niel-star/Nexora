// ─── Pre-deploy env checker ───
//
// Reads the current process environment and reports which envs documented
// in docs/PRODUCTION.md are missing, grouped by severity. Exits with code
// 0 when every REQUIRED env is present, 1 otherwise. Safe to run in CI.
//
// Usage:
//   npx tsx scripts/check-envs.ts
//
// This script never prints the value of any env variable — only whether
// it's set. The inventory below is the single source of truth for
// what "production-ready" looks like from a configuration standpoint
// and must stay in sync with `.env.example` and `docs/PRODUCTION.md`.

type Severity = "required" | "required-for-feature" | "optional";

interface EnvSpec {
  name: string;
  severity: Severity;
  subsystem: string;
  notes: string;
  alsoAccept?: string[]; // if any of these is set, treat as satisfied
}

const ENV_INVENTORY: EnvSpec[] = [
  // Core
  { name: "DATABASE_URL", severity: "required", subsystem: "db", notes: "Postgres connection string" },
  { name: "ENCRYPTION_KEY", severity: "required", subsystem: "security", notes: "32-byte hex key for the OAuth token vault" },
  { name: "NEXT_PUBLIC_APP_URL", severity: "required", subsystem: "core", notes: "Public URL of the admin/marketing app" },

  // Billing / MP
  {
    name: "MERCADOPAGO_BILLING_ACCESS_TOKEN",
    severity: "required",
    subsystem: "billing",
    notes: "MP platform wallet token for billing. Accepts MERCADOPAGO_ACCESS_TOKEN as fallback.",
    alsoAccept: ["MERCADOPAGO_ACCESS_TOKEN"],
  },
  { name: "MP_CLIENT_ID", severity: "required", subsystem: "payments", notes: "OAuth client id for tenant MP connection" },
  { name: "MP_CLIENT_SECRET", severity: "required", subsystem: "payments", notes: "OAuth client secret for tenant MP connection" },
  { name: "MP_WEBHOOK_SECRET", severity: "required", subsystem: "payments", notes: "HMAC for storefront payments webhook" },

  // Cron
  { name: "CRON_SECRET", severity: "required", subsystem: "cron", notes: "Shared secret for cron endpoints" },

  // Middleware / domains
  { name: "CANONICAL_APP_HOST", severity: "required-for-feature", subsystem: "middleware", notes: "Apex host for tenant custom domain routing" },

  // Email
  { name: "RESEND_API_KEY", severity: "required-for-feature", subsystem: "email", notes: "Emails fall back to MockProvider when unset" },

  // Ops
  { name: "NEXORA_OPS_EMAILS", severity: "optional", subsystem: "ops", notes: "Allowlist for /admin/billing/observability" },
  { name: "MERCADOPAGO_WEBHOOK_SECRET", severity: "optional", subsystem: "billing", notes: "HMAC for billing webhook (re-fetch protects without it)" },

  // IA (optional, mock fallback)
  { name: "ANTHROPIC_API_KEY", severity: "optional", subsystem: "ai", notes: "Claude; mock fallback otherwise" },
  { name: "GEMINI_API_KEY", severity: "optional", subsystem: "ai", notes: "Gemini; mock fallback otherwise" },

  // Ads (optional)
  { name: "GOOGLE_ADS_CLIENT_ID", severity: "optional", subsystem: "ads", notes: "Disables Google Ads OAuth if unset" },
  { name: "GOOGLE_ADS_CLIENT_SECRET", severity: "optional", subsystem: "ads", notes: "Disables Google Ads OAuth if unset" },
  { name: "GOOGLE_DEVELOPER_TOKEN", severity: "optional", subsystem: "ads", notes: "Disables Google Ads sync if unset" },
  { name: "FACEBOOK_APP_ID", severity: "optional", subsystem: "ads", notes: "Disables Meta Ads OAuth if unset" },
  { name: "FACEBOOK_APP_SECRET", severity: "optional", subsystem: "ads", notes: "Disables Meta Ads OAuth if unset" },
  { name: "TIKTOK_APP_ID", severity: "optional", subsystem: "ads", notes: "Disables TikTok Ads OAuth if unset" },
  { name: "TIKTOK_APP_SECRET", severity: "optional", subsystem: "ads", notes: "Disables TikTok Ads OAuth if unset" },

  // Analytics (optional)
  { name: "NEXT_PUBLIC_PLAUSIBLE_DOMAIN", severity: "optional", subsystem: "analytics", notes: "Client-side Plausible" },
  { name: "NEXT_PUBLIC_GA_ID", severity: "optional", subsystem: "analytics", notes: "Client-side GA4" },
  { name: "GA_MEASUREMENT_ID", severity: "optional", subsystem: "analytics", notes: "Server-side GA4 events" },
  { name: "GA_MEASUREMENT_PROTOCOL_SECRET", severity: "optional", subsystem: "analytics", notes: "Server-side GA4 events" },
];

// ─── Production safety checks ────────────────────────────────────────────
// Not just "is the env set?" — also warn on values that are clearly not
// production-safe (TEST tokens, localhost URLs, dev fallbacks).
interface SafetyCheck {
  envName: string;
  predicate: (value: string) => string | null; // returns error message or null
}

const PRODUCTION_SAFETY: SafetyCheck[] = [
  {
    envName: "MERCADOPAGO_BILLING_ACCESS_TOKEN",
    predicate: (v) => (v.startsWith("TEST-") ? "starts with 'TEST-' (MP sandbox). Real billing will route to sandbox." : null),
  },
  {
    envName: "MERCADOPAGO_ACCESS_TOKEN",
    predicate: (v) => (v.startsWith("TEST-") ? "starts with 'TEST-' (MP sandbox). Real billing will route to sandbox." : null),
  },
  {
    envName: "NEXT_PUBLIC_APP_URL",
    predicate: (v) => {
      if (v.includes("localhost")) return "points to localhost; MP back_urls and email CTAs will be broken in prod.";
      if (v.startsWith("http://") && !v.includes("localhost")) return "uses http:// (not https). MP OAuth requires https.";
      return null;
    },
  },
  {
    envName: "ENCRYPTION_KEY",
    predicate: (v) => (v === "fallback_dev_key_must_be_32_byte!" ? "is the dev fallback literal. Rotate with `openssl rand -hex 32`." : null),
  },
  {
    envName: "CRON_SECRET",
    predicate: (v) => (v.length < 16 ? `is only ${v.length} chars (recommended ≥ 32)` : null),
  },
  {
    envName: "MP_WEBHOOK_SECRET",
    predicate: (v) => (v.length < 16 ? `is only ${v.length} chars (recommended ≥ 32)` : null),
  },
];

// ─── Runner ──────────────────────────────────────────────────────────────
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const GREY = "\x1b[90m";
const RESET = "\x1b[0m";

function isSet(envName: string): boolean {
  const raw = process.env[envName];
  return typeof raw === "string" && raw.trim().length > 0;
}

function main() {
  const nodeEnv = process.env.NODE_ENV || "development";
  console.log(`\nNexora env check · NODE_ENV=${nodeEnv}\n`);

  const missingRequired: EnvSpec[] = [];
  const missingFeature: EnvSpec[] = [];
  const missingOptional: EnvSpec[] = [];
  const safetyWarnings: string[] = [];

  for (const spec of ENV_INVENTORY) {
    const set = isSet(spec.name) || (spec.alsoAccept || []).some(isSet);
    const label = set ? `${GREEN}[ok ]${RESET}` : `${RED}[   ]${RESET}`;
    const sev =
      spec.severity === "required"
        ? `${RED}REQ${RESET}`
        : spec.severity === "required-for-feature"
          ? `${YELLOW}FEAT${RESET}`
          : `${GREY}opt${RESET}`;
    console.log(`${label} ${sev}  ${spec.name.padEnd(40)} ${GREY}${spec.subsystem}${RESET}  ${spec.notes}`);
    if (!set) {
      if (spec.severity === "required") missingRequired.push(spec);
      else if (spec.severity === "required-for-feature") missingFeature.push(spec);
      else missingOptional.push(spec);
    }
  }

  console.log("");

  // Safety checks only on set values.
  for (const check of PRODUCTION_SAFETY) {
    const raw = process.env[check.envName];
    if (typeof raw !== "string" || raw.length === 0) continue;
    const msg = check.predicate(raw);
    if (msg) safetyWarnings.push(`${check.envName} ${msg}`);
  }

  if (safetyWarnings.length > 0) {
    console.log(`${YELLOW}Safety warnings:${RESET}`);
    for (const w of safetyWarnings) console.log(`  ${YELLOW}⚠${RESET}  ${w}`);
    console.log("");
  }

  // Summary
  const total = ENV_INVENTORY.length;
  const setCount = total - missingRequired.length - missingFeature.length - missingOptional.length;
  console.log(`Summary: ${setCount}/${total} envs set.`);
  console.log(`  required missing: ${missingRequired.length}`);
  console.log(`  feature  missing: ${missingFeature.length}`);
  console.log(`  optional missing: ${missingOptional.length}`);
  if (safetyWarnings.length > 0) {
    console.log(`  safety warnings: ${safetyWarnings.length}`);
  }

  // Policy: fail (exit 1) if any REQUIRED is missing in production, or if
  // there is any safety warning in production. In development we just
  // report.
  let exitCode = 0;
  if (nodeEnv === "production") {
    if (missingRequired.length > 0) {
      console.log(`\n${RED}FAIL:${RESET} ${missingRequired.length} required env(s) missing in production.`);
      exitCode = 1;
    }
    if (safetyWarnings.length > 0) {
      console.log(`\n${RED}FAIL:${RESET} ${safetyWarnings.length} safety warning(s) in production configuration.`);
      exitCode = 1;
    }
  } else {
    if (missingRequired.length > 0) {
      console.log(`\n${YELLOW}Non-production:${RESET} ${missingRequired.length} required env(s) missing. Set before deploying to production.`);
    } else {
      console.log(`\n${GREEN}OK:${RESET} every REQUIRED env is present.`);
    }
  }

  process.exit(exitCode);
}

main();
