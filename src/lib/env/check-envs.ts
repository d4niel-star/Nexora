export type Severity = "required" | "required-for-feature" | "optional";

export interface EnvSpec {
  name: string;
  severity: Severity;
  subsystem: string;
  notes: string;
  alsoAccept?: string[];
}

interface SafetyCheck {
  envName: string;
  predicate: (value: string) => string | null;
}

export type MpMode = "sandbox" | "live" | "unset";

export interface EnvCheckResult {
  ok: boolean;
  requiredMissing: string[];
  warnings: string[];
  mpMode: MpMode;
  emailProviderReady: boolean;
  appUrlLooksProduction: boolean;
  details: {
    total: number;
    setCount: number;
    missingRequired: string[];
    missingFeature: string[];
    missingOptional: string[];
    safetyWarnings: string[];
  };
}

// Single source of truth for production env readiness. This inventory must
// stay value-free: callers can print names and statuses, never secrets.
export const ENV_INVENTORY: readonly EnvSpec[] = [
  { name: "DATABASE_URL", severity: "required", subsystem: "db", notes: "Postgres connection string" },
  { name: "ENCRYPTION_KEY", severity: "required", subsystem: "security", notes: "32-byte hex key for the OAuth token vault" },
  { name: "NEXT_PUBLIC_APP_URL", severity: "required", subsystem: "core", notes: "Public URL of the admin/marketing app" },
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
  { name: "CRON_SECRET", severity: "required", subsystem: "cron", notes: "Shared secret for cron endpoints" },
  { name: "CANONICAL_APP_HOST", severity: "required-for-feature", subsystem: "middleware", notes: "Apex host for tenant custom domain routing" },
  {
    name: "RESEND_API_KEY",
    severity: "required",
    subsystem: "email",
    notes: "Real email provider. In production MockProvider is NOT used as fallback; missing key throws.",
  },
  {
    name: "RESEND_FROM_EMAIL",
    severity: "required-for-feature",
    subsystem: "email",
    notes: "Remitente Resend. EMAIL_FROM accepted as alias. Default literal only covers dev.",
    alsoAccept: ["EMAIL_FROM"],
  },
  { name: "NEXORA_OPS_EMAILS", severity: "optional", subsystem: "ops", notes: "Allowlist for /admin/billing/observability" },
  { name: "MERCADOPAGO_WEBHOOK_SECRET", severity: "optional", subsystem: "billing", notes: "HMAC for billing webhook (re-fetch protects without it)" },
  { name: "ANTHROPIC_API_KEY", severity: "optional", subsystem: "ai", notes: "Claude; mock fallback otherwise" },
  { name: "GEMINI_API_KEY", severity: "optional", subsystem: "ai", notes: "Gemini; mock fallback otherwise" },
  { name: "GOOGLE_ADS_CLIENT_ID", severity: "optional", subsystem: "ads", notes: "Disables Google Ads OAuth if unset" },
  { name: "GOOGLE_ADS_CLIENT_SECRET", severity: "optional", subsystem: "ads", notes: "Disables Google Ads OAuth if unset" },
  { name: "GOOGLE_DEVELOPER_TOKEN", severity: "optional", subsystem: "ads", notes: "Disables Google Ads sync if unset" },
  { name: "FACEBOOK_APP_ID", severity: "optional", subsystem: "ads", notes: "Disables Meta Ads OAuth if unset" },
  { name: "FACEBOOK_APP_SECRET", severity: "optional", subsystem: "ads", notes: "Disables Meta Ads OAuth if unset" },
  { name: "TIKTOK_APP_ID", severity: "optional", subsystem: "ads", notes: "Disables TikTok Ads OAuth if unset" },
  { name: "TIKTOK_APP_SECRET", severity: "optional", subsystem: "ads", notes: "Disables TikTok Ads OAuth if unset" },
  { name: "NEXT_PUBLIC_PLAUSIBLE_DOMAIN", severity: "optional", subsystem: "analytics", notes: "Client-side Plausible" },
  { name: "NEXT_PUBLIC_GA_ID", severity: "optional", subsystem: "analytics", notes: "Client-side GA4" },
  { name: "GA_MEASUREMENT_ID", severity: "optional", subsystem: "analytics", notes: "Server-side GA4 events" },
  { name: "GA_MEASUREMENT_PROTOCOL_SECRET", severity: "optional", subsystem: "analytics", notes: "Server-side GA4 events" },
];

const PRODUCTION_SAFETY: readonly SafetyCheck[] = [
  {
    envName: "MERCADOPAGO_BILLING_ACCESS_TOKEN",
    predicate: (value) => value.startsWith("TEST-") ? "MERCADOPAGO_BILLING_ACCESS_TOKEN is configured for MP sandbox." : null,
  },
  {
    envName: "MERCADOPAGO_ACCESS_TOKEN",
    predicate: (value) => value.startsWith("TEST-") ? "MERCADOPAGO_ACCESS_TOKEN is configured for MP sandbox." : null,
  },
  {
    envName: "NEXT_PUBLIC_APP_URL",
    predicate: (value) => {
      if (value.includes("localhost")) return "NEXT_PUBLIC_APP_URL points to localhost.";
      if (value.startsWith("http://")) return "NEXT_PUBLIC_APP_URL uses http instead of https.";
      return null;
    },
  },
  {
    envName: "ENCRYPTION_KEY",
    predicate: (value) => {
      if (value === "fallback_dev_key_must_be_32_byte!") return "ENCRYPTION_KEY is the dev fallback literal.";
      if (value.length < 32) return "ENCRYPTION_KEY is shorter than recommended.";
      return null;
    },
  },
  {
    envName: "CRON_SECRET",
    predicate: (value) => value.length < 16 ? "CRON_SECRET is shorter than recommended." : null,
  },
  {
    envName: "MP_WEBHOOK_SECRET",
    predicate: (value) => value.length < 32 ? "MP_WEBHOOK_SECRET is shorter than recommended." : null,
  },
  {
    envName: "RESEND_API_KEY",
    predicate: (value) => value.startsWith("re_") ? null : "RESEND_API_KEY does not look like a Resend API key.",
  },
];

export function isEnvSet(env: NodeJS.ProcessEnv, envName: string): boolean {
  const raw = env[envName];
  return typeof raw === "string" && raw.trim().length > 0;
}

export function isEnvSpecSatisfied(env: NodeJS.ProcessEnv, spec: EnvSpec): boolean {
  return isEnvSet(env, spec.name) || (spec.alsoAccept ?? []).some((name) => isEnvSet(env, name));
}

export function checkEnvVars(env: NodeJS.ProcessEnv = process.env): EnvCheckResult {
  const missingRequired: string[] = [];
  const missingFeature: string[] = [];
  const missingOptional: string[] = [];
  const safetyWarnings: string[] = [];

  for (const spec of ENV_INVENTORY) {
    if (isEnvSpecSatisfied(env, spec)) continue;
    if (spec.severity === "required") missingRequired.push(spec.name);
    else if (spec.severity === "required-for-feature") missingFeature.push(spec.name);
    else missingOptional.push(spec.name);
  }

  for (const check of PRODUCTION_SAFETY) {
    const raw = env[check.envName];
    if (typeof raw !== "string" || raw.length === 0) continue;
    const message = check.predicate(raw);
    if (message) safetyWarnings.push(message);
  }

  const requiredMissing = [...missingRequired, ...missingFeature];
  const warnings = [
    ...safetyWarnings,
    ...missingOptional.map((name) => `${name} is not configured.`),
  ];

  const appUrl = env.NEXT_PUBLIC_APP_URL ?? "";
  const appUrlLooksProduction =
    appUrl.startsWith("https://") && !appUrl.includes("localhost") && !appUrl.includes("127.0.0.1");

  const mpBillingRaw = env.MERCADOPAGO_BILLING_ACCESS_TOKEN ?? "";
  const mpStorefrontRaw = env.MERCADOPAGO_ACCESS_TOKEN ?? "";
  const mpMode: MpMode = mpBillingRaw.startsWith("TEST-") || mpStorefrontRaw.startsWith("TEST-")
    ? "sandbox"
    : (mpBillingRaw || mpStorefrontRaw ? "live" : "unset");

  const emailProviderReady =
    isEnvSet(env, "RESEND_API_KEY") &&
    (isEnvSet(env, "RESEND_FROM_EMAIL") || isEnvSet(env, "EMAIL_FROM"));

  const setCount =
    ENV_INVENTORY.length - missingRequired.length - missingFeature.length - missingOptional.length;

  return {
    ok: requiredMissing.length === 0 && safetyWarnings.length === 0,
    requiredMissing,
    warnings,
    mpMode,
    emailProviderReady,
    appUrlLooksProduction,
    details: {
      total: ENV_INVENTORY.length,
      setCount,
      missingRequired,
      missingFeature,
      missingOptional,
      safetyWarnings,
    },
  };
}
