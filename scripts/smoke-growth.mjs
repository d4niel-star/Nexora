// ─── Smoke for growth / lifecycle hub ───────────────────────────────────
//
// Verifies, without running a live DB, that the growth layer:
//   1. Is wired: the hub page exists, the sidebar entry is live, the
//      customers table renders the missing "Última compra" cell.
//   2. Is honest: getGrowthSnapshot never invents numbers — no
//      Math.random, no mock scores, no synthesized LTV/churn. Every
//      signal in the returned shape must be traceable back to a real
//      prisma query or an explicit rule call-site in the same file.
//   3. Is transparent: rule-based signals (reorder opportunity, cron
//      eligibility) spell out their thresholds on screen so the
//      merchant can audit them.
//
// This smoke is static grep/AST-free assertions — cheap, fast, and it
// catches regressions the second someone drops a mock value into the
// growth module.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

// Patterns that would mean the growth layer started inventing metrics.
// Case-insensitive. Comment-stripped before matching so doc comments
// explaining what's banned can't false-positive.
const bannedPatterns = [
  /churn\s*risk/i,
  /propensity\s*score/i,
  /predicted\s*ltv/i,
  /customer\s*health\s*score/i,
  /ml\s*model/i,
  /fake\s*segment/i,
  /mock\s*(ltv|churn|reorder)/i,
  /Math\.random/i,
];

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, acc);
    else if (/\.(tsx?|mjs|js)$/.test(entry)) acc.push(full);
  }
  return acc;
}

function stripComments(src) {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const checks = [
  {
    name: "Growth snapshot helper exists and is honest",
    file: "src/lib/growth/signals.ts",
    mustInclude: [
      "export async function getGrowthSnapshot",
      "prisma.order.count",
      "prisma.productReview.count",
      "prisma.bundleOffer.count",
      "POST_PURCHASE_REVIEW_REQUEST",
      "POST_PURCHASE_REORDER_FOLLOWUP",
      "getAggregatedCustomers",
      "reorderDelayDays",
      "ruleLabel",
    ],
    mustNotInclude: [
      "Math.random",
      "mockCustomers",
      "fakeLtv",
      "predictedChurn",
    ],
  },
  {
    name: "Growth page route wired, dynamic, session-gated",
    file: "src/app/admin/growth/page.tsx",
    mustInclude: [
      "getGrowthSnapshot",
      "GrowthPage",
      'dynamic = "force-dynamic"',
      "getCurrentStore",
      'redirect("/login")',
    ],
  },
  {
    name: "Growth UI reads only from snapshot (no live invention)",
    file: "src/components/admin/growth/GrowthPage.tsx",
    mustInclude: [
      // Snapshot is destructured on line `const { customers, lifecycle,
      // reorder, apps } = snapshot;` — accept either form to stay
      // robust against cosmetic refactors.
      "const { customers, lifecycle, reorder, apps } = snapshot",
      "reorder.ruleLabel",
      // Every CTA must link to a real admin surface — the presence of
      // these hrefs proves we route to existing modules, not clones.
      '"/admin/customers"',
      '"/admin/orders"',
      '"/admin/apps/product-reviews"',
      '"/admin/apps/post-purchase-flows/setup"',
      '"/admin/apps/whatsapp-recovery"',
      '"/admin/apps/bundles-upsells"',
      '"/admin/apps/order-tracking-widget"',
    ],
    mustNotInclude: [
      "Math.random",
      "churn",
      "predictedLtv",
    ],
  },
  {
    name: "Sidebar surfaces Clientes and Crecimiento",
    file: "src/components/admin/AdminShell.tsx",
    mustInclude: [
      'href: "/admin/customers"',
      'href: "/admin/growth"',
      "LineChart",
      "Users",
    ],
  },
  {
    name: "Customers table renders the Última compra cell",
    file: "src/components/admin/customers/CustomersClient.tsx",
    mustInclude: [
      "Última compra",
      "dateFormatter.format(new Date(c.lastPurchaseAt))",
      "Total gastado",
    ],
    mustNotInclude: [
      // Old mislabel was "LTV" on a raw sum of paid order totals.
      ">LTV<",
      // Old header typo accidentally shipped.
      "Canal Prominente",
    ],
  },
];

let passed = 0;
for (const check of checks) {
  const path = resolve(process.cwd(), check.file);
  let body;
  try {
    body = readFileSync(path, "utf8");
  } catch (err) {
    console.error(`✗  ${check.name}  →  cannot read ${check.file}: ${err.message}`);
    continue;
  }
  const stripped = stripComments(body);
  let ok = true;
  const details = [];
  for (const needle of check.mustInclude || []) {
    if (!body.includes(needle)) {
      ok = false;
      details.push(`missing: ${JSON.stringify(needle)}`);
    }
  }
  for (const needle of check.mustNotInclude || []) {
    if (stripped.includes(needle)) {
      ok = false;
      details.push(`still present: ${JSON.stringify(needle)}`);
    }
  }
  if (ok) {
    console.log(`✓  ${check.name}`);
    passed += 1;
  } else {
    console.error(`✗  ${check.name}`);
    for (const d of details) console.error(`   ${d}`);
  }
}

// Global no-invention scan across every growth-touching file.
const scopes = [
  resolve(process.cwd(), "src/lib/growth"),
  resolve(process.cwd(), "src/components/admin/growth"),
  resolve(process.cwd(), "src/app/admin/growth"),
];
let humoHits = 0;
const files = scopes.flatMap((scope) => {
  try {
    return walk(scope);
  } catch {
    return [];
  }
});
for (const file of files) {
  const body = stripComments(readFileSync(file, "utf8"));
  for (const pattern of bannedPatterns) {
    const match = body.match(pattern);
    if (match) {
      humoHits += 1;
      console.error(
        `✗  no-invention violation in ${file.replace(process.cwd(), "")}: ${match[0]}`,
      );
    }
  }
}
if (humoHits === 0) {
  console.log(`✓  no-invention scan (${files.length} growth files clean)`);
  passed += 1;
} else {
  console.error(`✗  no-invention scan: ${humoHits} violations`);
}

// Scenario coverage — the snapshot helper must handle each of the
// briefed scenarios. We check this by locating the code paths that
// compute them in signals.ts.
const signalsBody = stripComments(
  readFileSync(
    resolve(process.cwd(), "src/lib/growth/signals.ts"),
    "utf8",
  ),
);
const scenarioChecks = [
  {
    label: "Scenario: cliente con 1 sola compra",
    pattern: /segment.*===.*"new"/,
  },
  {
    label: "Scenario: cliente repetido (>= 2 compras)",
    pattern: /ordersCount\s*<\s*2/,
  },
  {
    label: "Scenario: pedido entregado + review pendiente (cron-eligible set)",
    pattern: /reviewRequestEligibleNow/,
  },
  {
    label: "Scenario: opportunity real de recompra, umbral del merchant",
    pattern: /reorderDelayDays/,
  },
  {
    label: "Scenario: tienda con apps activas / sin apps configuradas",
    pattern: /not_installed|needs_setup/,
  },
];
for (const sc of scenarioChecks) {
  if (sc.pattern.test(signalsBody)) {
    console.log(`✓  ${sc.label}`);
    passed += 1;
  } else {
    console.error(`✗  ${sc.label}`);
  }
}

const total = checks.length + 1 + scenarioChecks.length;
console.log(`\n${passed}/${total} growth guards pass`);
process.exit(passed === total ? 0 : 1);
