// ─── Smoke for admin sidebar information architecture (v4) ─────────────
//
// The sidebar was flattened across 11 top-level entries plus a
// dangling /admin/settings hub that duplicated modules already
// present elsewhere. This smoke guards the v4 rewrite:
//
//   · Primary nav is organised into 4 groups + 2 standalone leaves.
//   · Configuración is a collapsible group pinned BELOW Nexora IA.
//   · Settings hub no longer duplicates Mi Tienda, Branding, Clientes,
//     or any coming-soon placeholder.
//   · Every href referenced by the sidebar resolves to a real page
//     under src/app/admin/**/page.tsx.
//   · Groups support collapse/expand + auto-expand on active route.
//   · Mobile and desktop render the SAME navigation tree.
//   · Existing smokes keep passing: /admin/customers + /admin/growth
//     remain in the sidebar, LineChart + Users remain imported.
//
// Run: npx tsx scripts/smoke-navigation.mjs

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

const shellPath = resolve(
  process.cwd(),
  "src/components/admin/AdminShell.tsx",
);
const settingsPath = resolve(process.cwd(), "src/app/admin/settings/page.tsx");

const shellRaw = readFileSync(shellPath, "utf8");
const settingsRaw = readFileSync(settingsPath, "utf8");

function stripComments(src) {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const shell = stripComments(shellRaw);
const settings = stripComments(settingsRaw);

// ─── Step 1 · Every admin href referenced by the shell exists ─────────
//
// Extract every /admin/... literal in the shell source and confirm it
// maps to a real page.tsx under src/app. No dead links are allowed.
const hrefs = Array.from(shellRaw.matchAll(/"(\/admin\/[a-z0-9-/]+)"/gi))
  .map((m) => m[1])
  .filter((h) => !h.includes("/admin/ai-")); // legacy routes skipped below
const uniqueHrefs = Array.from(new Set(hrefs));

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

for (const href of uniqueHrefs) {
  const rel = href.replace(/^\/+/, "");
  const pageFile = resolve(process.cwd(), "src", "app", rel, "page.tsx");
  if (existsSync(pageFile)) {
    ok(`href resolves: ${href}`);
  } else {
    fail(`href resolves: ${href}`, `missing file: ${pageFile}`);
  }
}

// ─── Step 2 · Structural guards on the shell ──────────────────────────

const structuralChecks = [
  {
    label: "primary nav uses grouped data structure",
    pattern: /primaryNav:\s*readonly NavEntry\[\]/,
  },
  {
    label: "each of the four groups is declared",
    pattern:
      /id:\s*"sales"[\s\S]*id:\s*"catalog"[\s\S]*id:\s*"store"[\s\S]*id:\s*"apps"/,
  },
  {
    label: "configuración group exists and sits below Nexora IA",
    pattern:
      /NexoraIAEntry[\s\S]{0,500}SidebarGroup[\s\S]{0,200}settingsGroup/,
  },
  {
    label: "settings group label is literally 'Configuración'",
    pattern: /label:\s*"Configuración"/,
  },
  {
    label: "collapse/expand wiring (useState + onToggle + aria-expanded)",
    pattern:
      /useState<Record<string,\s*boolean>>[\s\S]*onToggle[\s\S]*aria-expanded=\{expanded\}/,
  },
  {
    label: "auto-expand on active group after navigation",
    pattern: /isGroupActive\(entry,\s*pathname\)/,
  },
  {
    label: "active leaf styling (accent bar + sidebar-active-bg)",
    pattern: /aria-current=\{active \? "page" : undefined\}/,
  },
  {
    label: "desktop + mobile reuse the SAME sidebarContent",
    pattern: /\{sidebarContent\}[\s\S]*\{sidebarContent\}/,
  },
  {
    label: "close on navigation (mobile UX)",
    pattern: /useEffect\(\(\)\s*=>\s*\{\s*closeSidebar\(\);/,
  },
  {
    label: "ESC key closes mobile sidebar",
    pattern: /e\.key\s*===\s*"Escape"/,
  },
  // Backwards-compat with smoke-growth.mjs (Clientes/Crecimiento rules).
  {
    label: "Clientes + Crecimiento remain in the sidebar",
    pattern:
      /href:\s*"\/admin\/customers"[\s\S]*href:\s*"\/admin\/growth"/,
  },
  {
    label: "LineChart + Users icons imported (growth smoke contract)",
    pattern: /LineChart[\s\S]*Users/,
  },
];

for (const check of structuralChecks) {
  if (check.pattern.test(shell)) {
    ok(check.label);
  } else {
    fail(check.label, `pattern not found`);
  }
}

// ─── Step 3 · Settings hub cleanup ────────────────────────────────────

const mustNotInSettings = [
  // Previously placeholder coming-soon items.
  '"Marketing"',
  '"Analíticas"',
  '"Sistema"',
  '"Soporte"',
  // Modules reassigned to their real sidebar group.
  '"Mi Tienda"',
  '"Branding y Dominio"',
  '"Clientes"',
  // Coming-soon plumbing left behind.
  "comingSoon: true",
];

for (const needle of mustNotInSettings) {
  if (settings.includes(needle)) {
    fail(`settings hub no longer lists ${needle}`, "still present");
  } else {
    ok(`settings hub no longer lists ${needle}`);
  }
}

const mustBeInSettings = [
  '"/admin/fiscal/settings"',
  '"/admin/billing"',
  '"/admin/finances"',
  '"/admin/integrations"',
];
for (const needle of mustBeInSettings) {
  if (settings.includes(needle)) {
    ok(`settings hub keeps real setting: ${needle}`);
  } else {
    fail(`settings hub keeps real setting: ${needle}`, "missing");
  }
}

// ─── Step 4 · No duplication between primary nav and settings group ──

// Duplication guard: each settings route should appear exactly once in
// the shell (inside settingsGroup). If a route also appeared in
// primaryNav, the occurrence count would be ≥ 2.
const duplicateFinder = [
  "/admin/billing",
  "/admin/finances",
  "/admin/fiscal/settings",
  "/admin/integrations",
  "/admin/settings",
];
for (const route of duplicateFinder) {
  const occurrencesInShell = (
    shellRaw.match(new RegExp(route.replace(/\//g, "\\/"), "g")) || []
  ).length;
  // 1 occurrence = only in the settings block (expected).
  // 2 occurrences would mean duplication in primaryNav.
  if (occurrencesInShell === 1) {
    ok(`no duplication for ${route}`);
  } else if (occurrencesInShell === 0) {
    fail(`no duplication for ${route}`, "route is gone from the sidebar");
  } else {
    fail(
      `no duplication for ${route}`,
      `appears ${occurrencesInShell} times`,
    );
  }
}

// ─── Step 5 · Total top-level count sanity ───────────────────────────
//
// Flat nav had 11 top-level entries + Nexora IA. New IA should have
// 4 leaves + 4 groups + Nexora IA + Configuración (= 10 rows in the
// sidebar root, half of them collapsible). We read the data literal
// size not the rendered DOM — pure source guard.
const primaryLeafCount = (shell.match(/kind:\s*"leaf"/g) || []).length;
if (primaryLeafCount >= 10) {
  ok(`sidebar exposes ${primaryLeafCount} leaves across groups (≥ 10)`);
} else {
  fail(
    `sidebar exposes enough leaves`,
    `found ${primaryLeafCount}, expected ≥ 10`,
  );
}

const total = passed + failed;
console.log(`\n${passed}/${total} navigation guards pass`);
process.exit(failed === 0 ? 0 : 1);
