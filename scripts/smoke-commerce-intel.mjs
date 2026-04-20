// ─── Smoke for merchant intelligence · commerce layer ──────────────────
//
// The CommandCenter at /admin/dashboard already covered velocity,
// margin, stock, sourcing and ops. This smoke validates the new
// commerce/merchandising extension: it must ship real signals,
// actionable CTAs to existing surfaces, and zero invented metrics.
//
// Run: npx tsx scripts/smoke-commerce-intel.mjs

import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

// Patterns that would mean commerce intel has drifted into fabrication.
// Case-insensitive. Comment-stripped before matching so doc comments
// describing banned patterns can't false-positive.
const bannedPatterns = [
  /conversion\s*probability/i,
  /ai\s*score/i,
  /product\s*score/i,
  /business\s*health\s*score/i,
  /predicted\s*revenue/i,
  /revenue\s*forecast/i,
  /magic\s*segment/i,
  /opportunity\s*detected\s*by\s*ai/i,
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
    name: "commerce-intel helper queries only real DB state",
    file: "src/lib/ai/commerce-intel.ts",
    mustInclude: [
      "export async function getCommerceIntelligence",
      // 5 real signals the brief demanded.
      "noPricePublished",
      "noVariantsPublished",
      "winnersWithoutReviews",
      "winnersWithoutBundles",
      "noCompareAtHighRotation",
      // Bound the winner set to avoid fan-out.
      "WINNERS_SAMPLE_LIMIT",
      // App-gated emission: do not nudge on an uninstalled app.
      "bundlesAppActive",
      "reviewsAppActive",
      // Real DB primitives only.
      "prisma.product.findMany",
      "prisma.productReview.groupBy",
      "prisma.bundleOffer.findMany",
      "prisma.installedApp.findUnique",
    ],
    mustNotInclude: [
      "Math.random",
      "mockCommerce",
      "fakeRevenue",
    ],
  },
  {
    name: "command-queries wires the commerce helper into the pipeline",
    file: "src/lib/ai/command-queries.ts",
    mustInclude: [
      'from "./commerce-intel"',
      "getCommerceIntelligence(storeId, velocity)",
      // Passed as the last (optional) arg to the orchestrator.
      "commerce,\n  );",
    ],
  },
  {
    name: "command-center emits the five commerce directives with real CTAs",
    file: "src/lib/ai/command-center.ts",
    mustInclude: [
      "commerce?: CommerceIntelligence",
      // All five directive ids must be present.
      '"cmd-commerce-no-price"',
      '"cmd-commerce-no-variants"',
      '"cmd-commerce-winners-no-reviews"',
      '"cmd-commerce-winners-no-bundles"',
      '"cmd-commerce-no-compareat-winner"',
      // Real routes — no duplicated screens.
      '"/admin/apps/product-reviews"',
      '"/admin/apps/bundles-upsells"',
      '"/admin/catalog"',
    ],
    mustNotInclude: [
      // The brief forbids AI-flavoured phrasing on merchandising hints.
      "AI-detected",
      "predicted conversion",
      "health score",
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

// Scenario coverage — each of the brief's required cases must be
// traceable to a code path in the helper.
const intelBody = stripComments(
  readFileSync(
    resolve(process.cwd(), "src/lib/ai/commerce-intel.ts"),
    "utf8",
  ),
);
const centerBody = stripComments(
  readFileSync(
    resolve(process.cwd(), "src/lib/ai/command-center.ts"),
    "utf8",
  ),
);

const scenarioChecks = [
  {
    label: "Scenario: producto publicado sin precio",
    pattern: /price:\s*\{\s*lte:\s*0\s*\}/,
    body: intelBody,
  },
  {
    label: "Scenario: producto publicado sin variantes",
    pattern: /variants:\s*\{\s*none:\s*\{\}\s*\}/,
    body: intelBody,
  },
  {
    label: "Scenario: top seller sin reseñas aprobadas",
    pattern: /reviewsAppActive[\s\S]*filter.*reviewCountByProduct/,
    body: intelBody,
  },
  {
    label: "Scenario: top seller sin bundle activo",
    pattern: /bundlesAppActive[\s\S]*bundleTriggerIdSet/,
    body: intelBody,
  },
  {
    label: "Scenario: alta rotación sin compareAtPrice",
    pattern: /highRotationWinnerIds[\s\S]*compareAtPrice/,
    body: intelBody,
  },
  {
    label: "Scenario: directivas skippean cuando la señal está vacía",
    pattern: /\.noPricePublished\.length\s*>\s*0/,
    body: centerBody,
  },
  {
    label: "Scenario: priority pipeline incluye critical + medium + low",
    pattern: /priority:\s*"critical"[\s\S]*priority:\s*"medium"[\s\S]*priority:\s*"low"/,
    body: centerBody,
  },
];

for (const sc of scenarioChecks) {
  if (sc.pattern.test(sc.body)) {
    console.log(`✓  ${sc.label}`);
    passed += 1;
  } else {
    console.error(`✗  ${sc.label}`);
  }
}

// Global no-invention scan across every commerce/ai file we touched.
const scopes = [resolve(process.cwd(), "src/lib/ai")];
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
  console.log(`✓  no-invention scan (${files.length} ai files clean)`);
  passed += 1;
} else {
  console.error(`✗  no-invention scan: ${humoHits} violations`);
}

const total = checks.length + scenarioChecks.length + 1;
console.log(`\n${passed}/${total} commerce-intel guards pass`);
process.exit(passed === total ? 0 : 1);
