// ─── Copilot v3 Validation Test Harness ──────────────────────────────────
// Run with: npx tsx scripts/test-copilot-v3.ts
//
// Tests the full v3 pipeline (interpreter → planner → engine fallback)
// against 50 prompts across 5 categories.

import { processInput, type ActionType } from "../src/lib/copilot/engine";
import type { ConversationContext } from "../src/lib/copilot/context";

// ─── Types ──────────────────────────────────────────────────────────────

interface TestResult {
  prompt: string;
  expectedIntent: string;
  mainIntent: string;
  status: string;
  understood: boolean;
  passed: boolean;
  entities: Record<string, string>;
  clarification: string | null;
  partialSuccess?: number;
  totalExpected?: number;
  allIntents?: string;
}

interface CategoryTotals {
  pass: number;
  fail: number;
  total: number;
}

// ─── Contexts ───────────────────────────────────────────────────────────

const EMPTY_CTX: ConversationContext = {
  lastAction: null,
  lastBlockType: null,
  lastColorChanged: null,
  lastFontChanged: null,
  lastThemeApplied: null,
  currentDevice: "desktop",
  undoStack: [],
};

const AFTER_VISUAL_TONE: ConversationContext = {
  ...EMPTY_CTX,
  lastAction: "apply-visual-tone",
  lastBlockType: "hero",
  lastColorChanged: "beige",
};

const AFTER_COLOR_CHANGE: ConversationContext = {
  ...EMPTY_CTX,
  lastAction: "change-primary-color",
  lastBlockType: null,
  lastColorChanged: "beige",
  lastFontChanged: null,
};

const AFTER_IMAGE_CHANGE: ConversationContext = {
  ...EMPTY_CTX,
  lastAction: "change-hero-image",
  lastBlockType: "hero",
  lastColorChanged: null,
};

const AFTER_SECTION_CHANGE: ConversationContext = {
  ...EMPTY_CTX,
  lastAction: "hide-section",
  lastBlockType: "testimonials",
  lastColorChanged: null,
};

// ─── Test runner ────────────────────────────────────────────────────────

function test(prompt: string, expectedIntent: string, ctx: ConversationContext = EMPTY_CTX): TestResult {
  try {
    const result = processInput(prompt, ctx);
    const actions = result.actions;
    const mainIntent = actions[0]?.intent ?? "unknown";
    const status = actions[0]?.status ?? "unsupported";
    const understood = result.understood;
    const entities = actions[0]?.entities ?? {};
    const clarification = actions[0]?.clarification ?? null;

    const passed = expectedIntent.split("|").some((ei: string) => mainIntent === ei) && (status !== "unsupported" || expectedIntent.includes("unknown"));
    return { prompt, expectedIntent, mainIntent, status, understood, passed, entities, clarification };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { prompt, expectedIntent, mainIntent: "ERROR", status: "error", understood: false, passed: false, entities: {}, clarification: msg };
  }
}

const results: Array<TestResult & { category: string }> = [];

// ═══ A. 20 ABSTRACT PROMPTS ═══
const abstracts: Array<[string, string]> = [
  ["quiero algo más premium", "apply-visual-tone"],
  ["hacelo más elegante", "apply-visual-tone"],
  ["más limpio", "apply-visual-tone|change-font-by-style"],
  ["más cálido", "apply-visual-tone"],
  ["más oscuro", "apply-visual-tone"],
  ["más editorial", "apply-visual-tone"],
  ["más minimalista", "apply-visual-tone"],
  ["la portada no me convence", "change-hero-image"],
  ["quiero algo más vendedor", "apply-visual-tone"],
  ["más luxury", "apply-visual-tone"],
  ["más fino", "apply-visual-tone"],
  ["menos duro", "apply-visual-tone"],
  ["más suave", "apply-visual-tone"],
  ["más caro", "apply-visual-tone"],
  ["algo más moderno", "apply-visual-tone"],
  ["mejorá esta parte", "apply-visual-tone|unknown"],
  ["quiero algo más aspiracional", "apply-visual-tone"],
  ["los botones más redondos", "change-button-style"],
  ["la imagen mejor", "change-hero-image"],
  ["quiero que se vea mejor", "apply-visual-tone"],
];
for (const [p, ei] of abstracts) results.push({ ...test(p, ei), category: "abstract" });

// ═══ B. 10 FOLLOW-UPS ═══
const followups: Array<[string, string, ConversationContext]> = [
  ["eso no", "undo", AFTER_VISUAL_TONE],
  ["el anterior", "undo", AFTER_COLOR_CHANGE],
  ["esa imagen", "change-hero-image", AFTER_IMAGE_CHANGE],
  ["esa sección", "hide-section|show-section|move-section", AFTER_SECTION_CHANGE],
  ["más beige", "change-color|change-primary-color", AFTER_COLOR_CHANGE],
  ["más marrón", "change-color|change-primary-color", AFTER_COLOR_CHANGE],
  ["dejalo como antes", "undo", AFTER_VISUAL_TONE],
  ["eso mismo pero más premium", "apply-visual-tone", AFTER_VISUAL_TONE],
  ["más suave", "apply-visual-tone", AFTER_VISUAL_TONE],
  ["aplicalo", "apply-theme|unknown", AFTER_VISUAL_TONE],
];
for (const [p, ei, ctx] of followups) results.push({ ...test(p, ei, ctx), category: "follow-up" });

// ═══ C. 10 COMPOUND PROMPTS ═══
const compounds: Array<[string, string]> = [
  ["cambiá la fuente y hacé el hero más premium", "change-font|apply-visual-tone"],
  ["poné colores más cálidos y hacé los botones más redondos", "change-color|change-primary-color|change-button-style|apply-visual-tone"],
  ["cambiá la imagen y subí esa sección", "change-hero-image|move-section"],
  ["poné algo más limpio, más elegante y más claro", "apply-visual-tone"],
  ["ocultá testimonios y cambiá el color a dorado", "hide-section|change-primary-color|change-color"],
  ["cambiá la tipografía a algo más editorial y poné una imagen mejor", "change-font-by-style|change-font|change-hero-image"],
  ["mostrame como se ve en el celu y poné tonos más oscuros", "switch-mobile|apply-visual-tone"],
  ["poné el botón pill y la fuente Playfair Display", "change-button-style|change-font"],
  ["mové beneficios arriba y ocultá FAQ", "move-section|hide-section"],
  ["cambiá el titular a \"Nueva Colección\" y el CTA a \"Ver más\"", "change-hero-headline|change-hero-cta"],
];
for (const [p, ei] of compounds) {
  const res = test(p, ei);
  // For compound, check if ANY expected intent was matched
  const expectedIntents = ei.split("|");
  const allActions = processInput(p, EMPTY_CTX).actions.map((a: { intent: string }) => a.intent);
  const matchedCount = expectedIntents.filter((e: string) => allActions.includes(e)).length;
  results.push({
    ...res,
    partialSuccess: matchedCount,
    totalExpected: expectedIntents.length,
    allIntents: allActions.join(", "),
    category: "compound",
  });
}

// ═══ D. 5 AMBIGUOUS PROMPTS ═══
const ambiguous: Array<[string, string, ConversationContext?]> = [
  ["hacelo mejor", "apply-visual-tone|unknown"],
  ["eso", "unknown", AFTER_VISUAL_TONE],
  ["más así", "apply-visual-tone|unknown", AFTER_VISUAL_TONE],
  ["cambialo", "apply-visual-tone|unknown", AFTER_VISUAL_TONE],
  ["quiero otra onda", "apply-visual-tone|unknown"],
];
for (const [p, ei, ctx] of ambiguous) results.push({ ...test(p, ei, ctx ?? EMPTY_CTX), category: "ambiguous" });

// ═══ E. 5 NO-OP / CONFLICT PROMPTS ═══
const noop: Array<[string, string, ConversationContext?]> = [
  ["deshacé", "undo", AFTER_VISUAL_TONE],
  ["no me gusta, volvé atrás", "undo", AFTER_COLOR_CHANGE],
  ["quiero algo más premium y más oscuro", "apply-visual-tone"],
  ["poné la imagen que ya tiene", "change-hero-image|unknown"],
  ["deshacé de nuevo", "undo"],
];
for (const [p, ei, ctx] of noop) results.push({ ...test(p, ei, ctx ?? EMPTY_CTX), category: "no-op" });

// ═══ OUTPUT RESULTS ═══
console.log("\n╔══════════════════════════════════════════════════════════════════════════════╗");
console.log("║                    COPILOT V3 VALIDATION RESULTS                             ║");
console.log("╚══════════════════════════════════════════════════════════════════════════════╝\n");

let totalPass = 0;
let totalFail = 0;
const byCategory: Record<string, CategoryTotals> = {};

for (const r of results) {
  const icon = r.passed ? "✅" : "❌";
  if (r.passed) totalPass++; else totalFail++;

  if (!byCategory[r.category]) byCategory[r.category] = { pass: 0, fail: 0, total: 0 };
  byCategory[r.category].total++;
  if (r.passed) byCategory[r.category].pass++; else byCategory[r.category].fail++;

  const compoundInfo = r.category === "compound" ? ` [${r.partialSuccess}/${r.totalExpected} intents: ${r.allIntents}]` : "";
  console.log(`${icon} [${r.category.toUpperCase().padEnd(10)}] "${r.prompt}"`);
  console.log(`   Expected: ${r.expectedIntent} → Got: ${r.mainIntent} (${r.status})${compoundInfo}`);
  if (!r.passed && r.clarification) {
    console.log(`   Clarification: ${r.clarification.substring(0, 80)}`);
  }
  console.log("");
}

console.log("═══════════════════════════════════════════════════════════════════════════════\n");
console.log("SUMMARY BY CATEGORY:");
for (const [cat, data] of Object.entries(byCategory)) {
  const pct = Math.round((data.pass / data.total) * 100);
  console.log(`  ${cat.padEnd(12)}: ${data.pass}/${data.total} passed (${pct}%)`);
}
console.log("");
const totalPct = Math.round((totalPass / results.length) * 100);
console.log(`TOTAL: ${totalPass}/${results.length} passed (${totalPct}%)`);
console.log(`FAILURES: ${totalFail}`);
console.log("");
if (totalFail > 0) {
  console.log("FAILED PROMPTS:");
  for (const r of results.filter((r: TestResult & { category: string }) => !r.passed)) {
    console.log(`  ❌ "${r.prompt}" → expected ${r.expectedIntent}, got ${r.mainIntent} (${r.status})`);
  }
}