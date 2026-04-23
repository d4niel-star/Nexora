// ─── Nexora AI Core — QA Test Harness ────────────────────────────────────
// Validates all 20 mandatory scenarios from the spec.

import { classifyMessage, type MessageCategory } from "../src/lib/copilot/classifier";
import { processInput } from "../src/lib/copilot/engine";
import type { ConversationContext } from "../src/lib/copilot/context";

// ─── Helpers ────────────────────────────────────────────────────────────

function ctx(hasHistory = true): ConversationContext {
  if (!hasHistory) {
    return {
      lastAction: null, lastColorChanged: null, lastBlockType: null,
      lastFontChanged: null, lastThemeApplied: null,
      undoStack: [], currentDevice: "desktop",
    };
  }
  return {
    lastAction: "apply-visual-tone",
    lastColorChanged: "#1A1A2E",
    lastBlockType: "hero",
    lastFontChanged: "Inter",
    lastThemeApplied: "premium",
    undoStack: [],
    currentDevice: "desktop",
  };
}

interface TestCase {
  input: string;
  expectedCategory: MessageCategory | MessageCategory[];
  shouldNotBreak: boolean; // must not throw or return error
  description: string;
}

const TESTS: TestCase[] = [
  // ── Sociales / ruido ─────────────────────────────────────────────────
  { input: "hola", expectedCategory: "social", shouldNotBreak: true, description: "Saludo simple" },
  { input: "hola todo bien", expectedCategory: "social", shouldNotBreak: true, description: "Saludo + social" },
  { input: "buenas", expectedCategory: "social", shouldNotBreak: true, description: "Saludo informal" },
  { input: "jajaja", expectedCategory: "social", shouldNotBreak: true, description: "Risa" },
  { input: "gracias", expectedCategory: "social", shouldNotBreak: true, description: "Agradecimiento" },
  { input: "quiero una pepsi", expectedCategory: "noise", shouldNotBreak: true, description: "Fuera de dominio" },
  { input: "banana", expectedCategory: "noise", shouldNotBreak: true, description: "Ruido simple" },
  { input: "cualquier cosa", expectedCategory: ["noise", "ambiguous"], shouldNotBreak: true, description: "Ruido vago" },

  // ── Pedidos reales ───────────────────────────────────────────────────
  { input: "quiero cambiar los botones", expectedCategory: "domain_action", shouldNotBreak: true, description: "Cambio de botones" },
  { input: "quiero algo mas premium", expectedCategory: "domain_action", shouldNotBreak: true, description: "Tono premium" },
  { input: "pone una imagen mejor", expectedCategory: "domain_action", shouldNotBreak: true, description: "Imagen mejor" },
  { input: "revisá qué me falta", expectedCategory: "ask_status", shouldNotBreak: true, description: "Ask status" },
  { input: "quiero mejorar la tienda", expectedCategory: "domain_action", shouldNotBreak: true, description: "Mejorar tienda" },
  { input: "mas elegante", expectedCategory: ["domain_action", "follow_up"], shouldNotBreak: true, description: "Tono elegante (short)" },
  { input: "mas calido", expectedCategory: ["domain_action", "follow_up"], shouldNotBreak: true, description: "Tono cálido (short)" },

  // ── Follow-up ────────────────────────────────────────────────────────
  { input: "eso no", expectedCategory: "follow_up", shouldNotBreak: true, description: "Rechazo" },
  { input: "el anterior", expectedCategory: ["follow_up", "undo"], shouldNotBreak: true, description: "Referencia anterior" },
  { input: "esa imagen", expectedCategory: "follow_up", shouldNotBreak: true, description: "Referencia imagen" },
  { input: "esa seccion", expectedCategory: "follow_up", shouldNotBreak: true, description: "Referencia sección" },
  { input: "dejalo como antes", expectedCategory: ["follow_up", "undo"], shouldNotBreak: true, description: "Undo implícito" },
];

// ─── Run tests ──────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

for (const test of TESTS) {
  const hasHistory = test.expectedCategory === "follow_up" || test.expectedCategory === "undo" ||
    (Array.isArray(test.expectedCategory) && (test.expectedCategory.includes("follow_up") || test.expectedCategory.includes("undo")));
  const context = ctx(hasHistory);

  // Test 1: Classifier
  const classification = classifyMessage(test.input, hasHistory);
  const expected = Array.isArray(test.expectedCategory) ? test.expectedCategory : [test.expectedCategory];
  const categoryOk = expected.includes(classification.category);

  // Test 2: Engine doesn't break
  let engineOk = true;
  let engineIntent = "";
  try {
    const result = processInput(test.input, context);
    engineIntent = result.actions[0]?.intent ?? "none";
    if (test.shouldNotBreak && result.actions.length === 0) {
      engineOk = false;
    }
  } catch (e) {
    engineOk = false;
  }

  const allOk = categoryOk && engineOk;
  if (allOk) {
    passed++;
    console.log(`✅ "${test.input}" → cat=${classification.category} intent=${engineIntent}`);
  } else {
    failed++;
    const reason = !categoryOk ? `cat=${classification.category} (expected ${expected.join("/")})` : "engine broke";
    console.log(`❌ "${test.input}" → ${reason} intent=${engineIntent}`);
  }
}

console.log(`\n${"=".repeat(60)}`);
console.log(`RESULTS: ${passed}/${TESTS.length} passed (${Math.round(passed / TESTS.length * 100)}%)`);
if (failed > 0) console.log(`FAILURES: ${failed}`);
process.exit(failed > 0 ? 1 : 0);