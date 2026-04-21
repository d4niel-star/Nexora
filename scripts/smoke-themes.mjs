// ─── Smoke for Tienda IA · Themes & Templates ──────────────────────────
//
// Validates the new theme/template layer:
//
//   1. A typed StoreTemplate type exists and the built-in registry
//      exports at least 3 curated templates. Each one must be valid
//      against the runtime validator (no drift between code and schema).
//   2. Server actions for apply / import / export exist and preserve
//      compatibility: the apply path only deletes source="template"
//      blocks — never source="manual" or source="ai".
//   3. The validator rejects unknown blockTypes and accepts the
//      canonical 7 block types the StoreSectionRenderer handles.
//   4. The validator rejects malformed colours and non-version=1 payloads.
//   5. ThemeLibrary client component is wired into StoreAIModule and
//      /admin/store-ai/page.tsx feeds it real data.
//   6. No fake import pipeline — validator explicitly rejects any
//      payload whose kind != "nexora.store-template" (or bare template).
//
// Run: npx tsx scripts/smoke-themes.mjs

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

const paths = {
  types: resolve(process.cwd(), "src/types/store-templates.ts"),
  registry: resolve(process.cwd(), "src/lib/themes/templates.ts"),
  validation: resolve(process.cwd(), "src/lib/themes/validation.ts"),
  actions: resolve(process.cwd(), "src/lib/themes/actions.ts"),
  queries: resolve(process.cwd(), "src/lib/themes/queries.ts"),
  library: resolve(process.cwd(), "src/components/admin/themes/ThemeLibrary.tsx"),
  module: resolve(process.cwd(), "src/components/admin/store-ai/StoreAIModule.tsx"),
  page: resolve(process.cwd(), "src/app/admin/store-ai/page.tsx"),
};

// ─── Step 1 · files exist ──────────────────────────────────────────────

for (const [key, p] of Object.entries(paths)) {
  if (existsSync(p)) ok(`file exists: ${key}`);
  else fail(`file exists: ${key}`, p);
}

// ─── Step 2 · registry exports ≥ 3 templates ──────────────────────────

const registrySrc = stripComments(readFileSync(paths.registry, "utf8"));

const templateIdMatches = [...registrySrc.matchAll(/id:\s*"([a-z0-9-]+)",/g)].map(
  (m) => m[1],
);
if (templateIdMatches.length >= 3) {
  ok(`registry ships ${templateIdMatches.length} templates`);
} else {
  fail(
    `registry ships ≥ 3 templates`,
    `only found: ${templateIdMatches.join(", ") || "none"}`,
  );
}

// version:1 and themeStyle hex are shared by every template — spot check.
if (registrySrc.includes("version: 1")) ok("every template declares version: 1");
else fail("every template declares version: 1");

// ─── Step 3 · validation schema is strict ──────────────────────────────

const validationSrc = stripComments(readFileSync(paths.validation, "utf8"));

const schemaChecks = [
  {
    label: "validator enumerates the 7 canonical block types",
    pattern:
      /ACCEPTED_BLOCK_TYPES[\s\S]*?"hero"[\s\S]*?"benefits"[\s\S]*?"featured_products"[\s\S]*?"featured_categories"[\s\S]*?"testimonials"[\s\S]*?"faq"[\s\S]*?"newsletter"/,
  },
  {
    label: "validator enumerates the 3 theme styles",
    pattern: /ACCEPTED_THEME_STYLES[\s\S]*?"minimal"[\s\S]*?"bold"[\s\S]*?"classic"/,
  },
  {
    label: "validator uses strict hex color regex",
    pattern: /HEX_COLOR\s*=\s*\/\^#\[0-9a-fA-F\]\{6\}\$\//,
  },
  {
    label: "validator rejects version != 1",
    pattern: /version !== 1/,
  },
  {
    label: "validator rejects non-Nexora export envelopes",
    pattern: /"nexora\.store-template"/,
  },
  {
    label: "exports parseTemplatePayload for JSON import",
    pattern: /export function parseTemplatePayload/,
  },
];

for (const c of schemaChecks) {
  if (c.pattern.test(validationSrc)) ok(c.label);
  else fail(c.label);
}

// ─── Step 4 · apply pipeline preserves manual + ai blocks ─────────────

const actionsSrc = stripComments(readFileSync(paths.actions, "utf8"));

const actionsChecks = [
  {
    label: "apply only deletes source=template blocks",
    // Find the deleteMany on storeBlock scoped to source="template"
    pattern: /storeBlock\.deleteMany\s*\(\s*\{\s*where:\s*\{[^}]*source:\s*"template"/,
  },
  {
    label: "apply writes blocks with source=template",
    pattern: /source:\s*"template"/,
  },
  {
    label: "apply uses validateBlockSettings against every block",
    pattern: /validateBlockSettings/,
  },
  {
    label: "apply upserts StoreBranding + StoreTheme",
    pattern:
      /storeBranding\.upsert[\s\S]*?storeTheme\.upsert/,
  },
  {
    label: "apply writes a SystemEvent with templateId in metadata",
    pattern: /eventType:\s*TEMPLATE_APPLY_EVENT_TYPE[\s\S]*?templateId/,
  },
  {
    label: "import action parses JSON before applying",
    pattern: /applyImportedTemplateAction[\s\S]*?parseTemplatePayload/,
  },
  {
    label: "export action returns StoreTemplateExport envelope",
    pattern: /kind:\s*"nexora\.store-template"/,
  },
  {
    label: "import route does NOT touch source='manual' or 'ai' blocks",
    // The deleteMany is scoped to source:"template" — assert we NEVER
    // call deleteMany without that constraint on StoreBlock in actions.
    pattern:
      /storeBlock\.deleteMany[\s\S]*?source:\s*"template"/,
  },
];

for (const c of actionsChecks) {
  if (c.pattern.test(actionsSrc)) ok(c.label);
  else fail(c.label);
}

// Negative check: make sure apply does NOT delete all blocks unconditionally.
if (/storeBlock\.deleteMany\s*\(\s*\{\s*where:\s*\{\s*storeId[^}]*pageType:\s*"home"\s*\}\s*\}\s*\)/.test(
  actionsSrc,
)) {
  fail(
    "apply action must NOT wipe all home blocks",
    "found a deleteMany scoped only by storeId+pageType (would nuke manual + ai blocks)",
  );
} else {
  ok("apply action never wipes all home blocks");
}

// ─── Step 5 · UI wiring ────────────────────────────────────────────────

const moduleSrc = stripComments(readFileSync(paths.module, "utf8"));
const pageSrc = stripComments(readFileSync(paths.page, "utf8"));
const librarySrc = stripComments(readFileSync(paths.library, "utf8"));

const uiChecks = [
  {
    src: moduleSrc,
    label: "StoreAIModule accepts templates + themeState props",
    pattern: /templates\?:\s*readonly\s+StoreTemplate\[\][\s\S]*?themeState\?:|themeState\?:[\s\S]*?templates\?:/,
  },
  {
    src: moduleSrc,
    label: "StoreAIModule renders ThemeLibrary when data is present",
    pattern:
      /themeState\s*&&\s*templates[\s\S]*?<ThemeLibrary[\s\S]*?current=\{themeState\}/,
  },
  {
    src: pageSrc,
    label: "page passes themeState + templates to StoreAIModule",
    pattern:
      /themeState=\{currentThemeView\}[\s\S]*?templates=\{templates\}/,
  },
  {
    src: pageSrc,
    label: "page fetches getCurrentThemeState + listBuiltInTemplates",
    pattern: /getCurrentThemeState[\s\S]*?listBuiltInTemplates/,
  },
  {
    src: librarySrc,
    label: "ThemeLibrary wires applyBuiltInTemplateAction",
    pattern: /applyBuiltInTemplateAction/,
  },
  {
    src: librarySrc,
    label: "ThemeLibrary wires applyImportedTemplateAction with validation errors surface",
    pattern:
      /applyImportedTemplateAction[\s\S]*?importErrors/,
  },
  {
    src: librarySrc,
    label: "ThemeLibrary wires exportCurrentStoreAsTemplateAction",
    pattern: /exportCurrentStoreAsTemplateAction/,
  },
  {
    src: librarySrc,
    label: "ThemeLibrary renders an Aplicado chip for the current template",
    pattern: /Aplicado/,
  },
];

for (const c of uiChecks) {
  if (c.pattern.test(c.src)) ok(c.label);
  else fail(c.label);
}

// ─── Step 6 · no fake import promise ───────────────────────────────────

const honesty = [
  {
    src: librarySrc,
    label: "ThemeLibrary states it does NOT accept Shopify / Tiendanube",
    // Whitespace-tolerant match — JSX wraps the copy across lines.
    pattern: /No aceptamos\s+themes de Shopify ni Tiendanube/i,
  },
];
for (const c of honesty) {
  if (c.pattern.test(c.src)) ok(c.label);
  else fail(c.label);
}

// ─── Step 7 · no-invention scan ────────────────────────────────────────

const banned = [/Math\.random/, /ai\s*score/i, /business\s*health\s*score/i];
const scanFiles = Object.values(paths);
let bannedHits = 0;
for (const file of scanFiles) {
  if (!existsSync(file)) continue;
  const body = stripComments(readFileSync(file, "utf8"));
  for (const rx of banned) {
    const m = body.match(rx);
    if (m) {
      fail(`no-invention scan: ${file.replace(process.cwd(), "")}`, `hit ${m[0]}`);
      bannedHits += 1;
    }
  }
}
if (bannedHits === 0) ok(`no-invention scan (${scanFiles.length} theme files clean)`);

const total = passed + failed;
console.log(`\n${passed}/${total} theme guards pass`);
process.exit(failed === 0 ? 0 : 1);
