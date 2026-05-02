// ─── Smoke for the dedicated /admin/settings center ────────────────────
//
// Configuración stops being a sublist in the global sidebar and becomes
// its own first-class surface:
//
//   · /admin/settings (overview)
//   · /admin/settings/pagos           (inline MP status + connect CTA)
//   · /admin/settings/legal           (inlines LegalSettingsForm)
//   · /admin/settings/dominios        (real domain status + deep link)
//   · /admin/settings/comunicacion    (WhatsApp + post-purchase status)
//   · /admin/settings/plan            (status + deep link to /admin/billing)
//   · /admin/settings/integraciones   (count + deep link to /admin/integrations)
//
// `Finanzas y retiros` was intentionally removed: Nexora does not run
// an internal payouts pipeline yet, so the surface had nothing real
// to configure. The smoke now refuses to let it come back without a
// real backing flow.
//
// The layout at (tenant)/layout.tsx wraps every tenant page with the
// SettingsShell shared header. The ops-only route
// /admin/settings/integrations/mercadopago lives OUTSIDE the (tenant)
// group so it does not inherit the tenant shell.
//
// This smoke guards the four absolute rules:
//   1. Every category page exists and renders a real server component.
//   2. SettingsShell stays a thin wrapper with no duplicate category nav.
//   3. The (tenant) layout wraps exactly the tenant pages (ops route
//      stays out of the group).
//   4. No category page ships a hardcoded fabricated status — each one
//      either reads from prisma/server actions or renders a reusable
//      existing form.
//
// Run: npx tsx scripts/smoke-settings.mjs

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

let passed = 0;
let failed = 0;

function ok(label) {
  console.log(`✓  ${label}`);
  passed += 1;
}
function fail(label, detail) {
  console.error(`✗  ${label}`);
  if (detail) console.error(`   ${detail}`);
  failed += 1;
}

function stripComments(src) {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

// ─── 1. Category pages exist at the expected absolute paths ──────────

const categories = [
  { slug: "pagos", label: "Medios de pago" },
  { slug: "legal", label: "Legal y ARCA" },
  { slug: "dominios", label: "Dominios" },
  { slug: "comunicacion", label: "WhatsApp y mensajes" },
  { slug: "plan", label: "Plan y facturación" },
  { slug: "integraciones", label: "Integraciones" },
];

// Categories that used to exist and were intentionally removed. Their
// pages and links must NOT come back without a real backing flow.
const removedCategories = ["finanzas"];

const baseRel = "src/app/admin/settings/(tenant)";

for (const cat of categories) {
  const path = resolve(process.cwd(), `${baseRel}/${cat.slug}/page.tsx`);
  if (existsSync(path)) {
    ok(`category page exists: /admin/settings/${cat.slug}`);
  } else {
    fail(`category page exists: /admin/settings/${cat.slug}`, `missing ${path}`);
  }
}

// Overview page + tenant layout.
const overviewPath = resolve(process.cwd(), `${baseRel}/page.tsx`);
if (existsSync(overviewPath)) ok("tenant settings overview exists at /admin/settings");
else fail("tenant settings overview exists at /admin/settings", `missing ${overviewPath}`);

const layoutPath = resolve(process.cwd(), `${baseRel}/layout.tsx`);
if (existsSync(layoutPath)) ok("tenant (tenant)/layout.tsx exists");
else fail("tenant (tenant)/layout.tsx exists", `missing ${layoutPath}`);

// Ops-only diagnostic must stay OUTSIDE the (tenant) group so its page
// does not inherit the settings shell. URL remains /admin/settings/integrations/mercadopago.
const opsRoute = resolve(
  process.cwd(),
  "src/app/admin/settings/integrations/mercadopago/page.tsx",
);
if (existsSync(opsRoute)) ok("ops-only MP diagnostic kept at /admin/settings/integrations/mercadopago");
else fail("ops-only MP diagnostic kept at /admin/settings/integrations/mercadopago", "missing page");

const opsInsideTenant = resolve(
  process.cwd(),
  `${baseRel}/integrations/mercadopago/page.tsx`,
);
if (existsSync(opsInsideTenant)) {
  fail(
    "ops route is NOT inside the (tenant) group",
    "found page inside tenant group — ops should not inherit the tenant shell",
  );
} else {
  ok("ops route is NOT inside the (tenant) group");
}

// ─── 2. SettingsShell stays thin (no duplicate category registry) ─────

const shellSrc = stripComments(
  readFileSync(
    resolve(process.cwd(), "src/components/admin/settings/SettingsShell.tsx"),
    "utf8",
  ),
);

if (/AdminPageHeader/.test(shellSrc) && /\{children\}/.test(shellSrc)) {
  ok("SettingsShell renders the shared header and children");
} else {
  fail("SettingsShell renders the shared header and children");
}

if (!/SETTINGS_CATEGORIES/.test(shellSrc)) {
  ok("SettingsShell does not keep a duplicate category registry");
} else {
  fail("SettingsShell does not keep a duplicate category registry");
}

if (!/<aside[^>]*aria-label=/.test(shellSrc)) {
  ok("SettingsShell does not render the removed desktop summary panel");
} else {
  fail("SettingsShell does not render the removed desktop summary panel");
}

if (!/id="settings-category-mobile"/.test(shellSrc)) {
  ok("SettingsShell does not render a duplicate mobile category picker");
} else {
  fail("SettingsShell does not render a duplicate mobile category picker");
}

if (!/usePathname|window\.location/.test(shellSrc)) {
  ok("SettingsShell has no client-only navigation logic");
} else {
  fail("SettingsShell has no client-only navigation logic");
}

// ─── 3. (tenant) layout wires the shell ──────────────────────────────

const layoutSrc = stripComments(readFileSync(layoutPath, "utf8"));
if (/SettingsShell/.test(layoutSrc) && /children/.test(layoutSrc)) {
  ok("tenant layout renders <SettingsShell>{children}</SettingsShell>");
} else {
  fail("tenant layout renders <SettingsShell>{children}</SettingsShell>");
}

// ─── 4. Honest data: category pages read from prisma or reuse forms ──
//
// For each slug we assert something concrete about the page source to
// protect against a future contributor replacing real data with a
// hardcoded fake.

const honestyChecks = [
  {
    slug: "pagos",
    label: "pagos page reads MP connection from prisma",
    mustInclude: ["storePaymentProvider.findUnique", "getMercadoPagoPlatformReadiness"],
  },
  {
    slug: "legal",
    label: "legal page reuses LegalSettingsForm + real actions",
    mustInclude: [
      "LegalSettingsForm",
      "getStoreFiscalProfileAction",
      "getStoreLegalSettingsAction",
    ],
  },
  {
    slug: "dominios",
    label: "dominios page reads StoreDomain rows from prisma",
    mustInclude: ["storeDomain.findMany"],
  },
  {
    slug: "comunicacion",
    label: "comunicacion page reads real whatsapp + post-purchase state",
    mustInclude: ["getPublicWhatsappSettings", "installedApp.findUnique"],
  },
  {
    slug: "plan",
    label: "plan page deep-links to /admin/billing",
    mustInclude: ["/admin/billing"],
  },
  {
    slug: "integraciones",
    label: "integraciones page counts real providerConnection rows",
    mustInclude: ["providerConnection.count", "/admin/integrations"],
  },
];

// Hard guard: removed categories must not regrow a page or be linked
// from the shell / overview.
for (const slug of removedCategories) {
  const path = resolve(process.cwd(), `${baseRel}/${slug}/page.tsx`);
  if (existsSync(path)) {
    fail(
      `removed category ${slug} stays removed`,
      `unexpected page at ${path}`,
    );
  } else {
    ok(`removed category ${slug} stays removed (no page)`);
  }
}

for (const check of honestyChecks) {
  const path = resolve(process.cwd(), `${baseRel}/${check.slug}/page.tsx`);
  const src = existsSync(path) ? stripComments(readFileSync(path, "utf8")) : "";
  let pageOk = true;
  const missing = [];
  for (const needle of check.mustInclude) {
    if (!src.includes(needle)) {
      pageOk = false;
      missing.push(needle);
    }
  }
  if (pageOk) {
    ok(check.label);
  } else {
    fail(check.label, `missing: ${missing.join(", ")}`);
  }
}

// ─── 5. No invented metrics ──────────────────────────────────────────
//
// Settings is a legal/financial surface; no "AI score", no Math.random,
// no magic segment language allowed anywhere in the settings tree.

const banned = [
  /Math\.random/,
  /ai\s*score/i,
  /business\s*health\s*score/i,
  /predicted\s*revenue/i,
];

const filesUnderTenant = [overviewPath, ...categories.map((c) =>
  resolve(process.cwd(), `${baseRel}/${c.slug}/page.tsx`),
)];
let bannedHits = 0;
for (const file of filesUnderTenant) {
  if (!existsSync(file)) continue;
  const body = stripComments(readFileSync(file, "utf8"));
  for (const rx of banned) {
    const m = body.match(rx);
    if (m) {
      fail(
        `no-invention scan: ${file.replace(process.cwd(), "")}`,
        `hit ${m[0]}`,
      );
      bannedHits += 1;
    }
  }
}
if (bannedHits === 0) {
  ok(`no-invention scan (${filesUnderTenant.length} settings files clean)`);
}

// ─── 6. Overview category dashboard stays canonical ───────────────────
//
// The overview page is the single category dashboard. It must NOT import
// a second registry from SettingsShell, and every expected
// /admin/settings/<slug> href must remain present on the dashboard.

const overviewSrc = stripComments(readFileSync(overviewPath, "utf8"));

if (overviewSrc.includes("SETTINGS_CATEGORIES")) {
  fail(
    "overview must NOT import SETTINGS_CATEGORIES (client→server)",
    "crossing the boundary breaks the Render runtime; use the local array",
  );
} else {
  ok("overview does not cross the client→server boundary for categories");
}

// Extract every "/admin/settings/<slug>" literal from each file and
// assert the overview covers every expected category.
const shellSlugs = Array.from(
  shellSrc.matchAll(/"\/admin\/settings\/([a-z0-9-]+)"/g),
  (m) => m[1],
);
const overviewSlugs = Array.from(
  overviewSrc.matchAll(/"\/admin\/settings\/([a-z0-9-]+)"/g),
  (m) => m[1],
);
const missingInOverview = categories
  .map((cat) => cat.slug)
  .filter((slug) => !overviewSlugs.includes(slug));
if (missingInOverview.length === 0) {
  ok(`overview covers every expected category slug (${categories.length})`);
} else {
  fail(
    "overview covers every expected category slug",
    `missing: ${missingInOverview.join(", ")}`,
  );
}

// Removed slugs must NOT appear in either source.
for (const slug of removedCategories) {
  const inShell = shellSlugs.includes(slug);
  const inOverview = overviewSlugs.includes(slug);
  if (!inShell && !inOverview) {
    ok(`removed slug ${slug} not referenced from shell or overview`);
  } else {
    fail(
      `removed slug ${slug} not referenced from shell or overview`,
      [inShell ? "still in shell" : null, inOverview ? "still in overview" : null]
        .filter(Boolean)
        .join(", "),
    );
  }
}

const total = passed + failed;
console.log(`\n${passed}/${total} settings guards pass`);
process.exit(failed === 0 ? 0 : 1);
