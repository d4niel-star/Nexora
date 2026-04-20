// ─── Smoke for storefront conversion polish ─────────────────────────────
// Verifies two things at once:
//   1. Adoption — the new trust/review primitives are wired into the PDP,
//      the cart, and the Hero dead-link is gone.
//   2. No-humo — none of the surfaces ship fabricated social proof,
//      urgency, scarcity or popularity copy. The list of banned phrases
//      below is literal; if any of them appears in storefront code, a
//      real signal got replaced by a fake one and we fail loudly.
//
// Run: npx tsx scripts/smoke-storefront.mjs

import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

// Banned CRO-humo patterns. Each pattern is matched case-insensitively
// against storefront component/page sources. These exact phrases have
// no honest data source in Nexora today, so they can only be invented.
const bannedPatterns = [
  /personas? (lo|la) est[aá]n viendo/i,
  /personas? viendo ahora/i,
  /vendido \d+ veces/i,
  /se vendieron \d+/i,
  /producto popular/i,
  /m[aá]s popular/i,
  /best ?seller/i,
  /queda[nr]? (s[oó]lo|solo|apenas)? ?\d+\s*(unidad|en stock)?/i,
  /[úu]ltim[ao]s? unidades/i,
  /\bcompra ya\b/i,
  /oferta por tiempo limitado/i,
  /\blimited time\b/i,
  /verified buyers?/i,
];

const storefrontRoot = resolve(process.cwd(), "src");
const storefrontScopes = [
  resolve(storefrontRoot, "app/store"),
  resolve(storefrontRoot, "components/storefront"),
  resolve(storefrontRoot, "lib/storefront"),
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

// Strip // line comments, /* … */ block comments, and {/* … */} JSX
// comments. The no-humo scan only cares about code/strings that would
// actually render — doc comments explaining WHY a pattern is forbidden
// must not false-positive.
function stripComments(src) {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "") // JSX block comments
    .replace(/\/\*[\s\S]*?\*\//g, "")     // JS block comments
    .replace(/(^|[^:])\/\/.*$/gm, "$1"); // JS line comments (skip http://)
}

const checks = [
  {
    name: "PDP uses TrustSignals + ReviewSummary + BreadcrumbList JSON-LD",
    file: "src/app/store/[storeSlug]/products/[productId]/page.tsx",
    mustInclude: [
      "<TrustSignals",
      "<ReviewSummary",
      "getStorefrontTrustSignals(",
      '"@type": "BreadcrumbList"',
      'id="reviews"',
    ],
  },
  {
    name: "Cart page uses TrustSignals",
    file: "src/app/store/[storeSlug]/cart/page.tsx",
    mustInclude: [
      "<TrustSignals",
      "getStorefrontTrustSignals(",
      'variant="cart"',
    ],
  },
  {
    name: "Hero dead-link #'' is removed",
    file: "src/components/storefront/sections/HeroSection.tsx",
    mustNotInclude: [
      'href="#"',
    ],
    mustInclude: [
      "secondaryActionLink",
      "secondaryHref",
    ],
  },
  {
    name: "Collections index uses shared EmptyState",
    file: "src/app/store/[storeSlug]/collections/page.tsx",
    mustInclude: [
      'from "@/components/ui/EmptyState"',
      "<EmptyState",
      "Todavía no hay colecciones publicadas",
    ],
    mustNotInclude: [
      "No hay colecciones publicadas.",
      "Volvé más tarde",
    ],
  },
  {
    name: "Trust helper derives only real signals",
    file: "src/lib/storefront/trust.ts",
    mustInclude: [
      "hasMercadoPagoConnected",
      "freeShippingOver",
      "hasReturnsPolicy",
    ],
    mustNotInclude: [
      // Zero tolerance for any fabricated counters
      "Math.random",
      "Math.floor(Math.random",
      "mockViewers",
      "fakeStock",
    ],
  },
  {
    name: "ReviewSummary bails when count <= 0",
    file: "src/components/storefront/product/ReviewSummary.tsx",
    mustInclude: [
      "count <= 0 || averageRating == null",
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

  // mustInclude runs against the raw file (doc-comments are expected
  // to contain things like "no X"). mustNotInclude runs against the
  // comment-stripped file so explanatory docs about dead patterns
  // don't trigger false positives.
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

// Global no-humo scan — catches fake urgency/social-proof anywhere in
// storefront code, regardless of which file. We skip our own smoke
// scripts and the list of banned patterns itself.
let humoHits = 0;
const files = storefrontScopes.flatMap((scope) => {
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
        `✗  no-humo violation in ${file.replace(process.cwd(), "")}: ${match[0]}`,
      );
    }
  }
}
if (humoHits === 0) {
  console.log(`✓  no-humo scan (${files.length} storefront files clean)`);
  passed += 1;
} else {
  console.error(`✗  no-humo scan: ${humoHits} violations`);
}

const total = checks.length + 1;
console.log(`\n${passed}/${total} storefront guards pass`);
process.exit(passed === total ? 0 : 1);
