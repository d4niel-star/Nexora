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
// The tenant settings index moved into the (tenant) route group so that
// the new SettingsShell layout only wraps tenant pages (ops-only routes
// stay outside). URL is still /admin/settings.
const settingsPath = resolve(
  process.cwd(),
  "src/app/admin/settings/(tenant)/page.tsx",
);

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

// Resolve an /admin/* href against the filesystem. Next.js route groups
// (`(name)`) don't affect the URL, so a URL like /admin/settings can
// live at either src/app/admin/settings/page.tsx or inside any route
// group under src/app/admin/settings/(group)/page.tsx. We probe the
// direct path first and fall back to scanning route-group children.
function resolveHrefToPageFile(href) {
  const rel = href.replace(/^\/+/, "");
  const direct = resolve(process.cwd(), "src", "app", rel, "page.tsx");
  if (existsSync(direct)) return direct;
  const parentDir = resolve(process.cwd(), "src", "app", rel);
  if (!existsSync(parentDir)) return null;
  try {
    for (const entry of readdirSync(parentDir)) {
      if (entry.startsWith("(") && entry.endsWith(")")) {
        const grouped = resolve(parentDir, entry, "page.tsx");
        if (existsSync(grouped)) return grouped;
      }
    }
  } catch {
    /* parentDir is a file, not a directory — let the caller fail below */
  }
  return null;
}

for (const href of uniqueHrefs) {
  const pageFile = resolveHrefToPageFile(href);
  if (pageFile) {
    ok(`href resolves: ${href}`);
  } else {
    fail(`href resolves: ${href}`, `no page.tsx found for ${href}`);
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
    label: "configuración is a single pinned leaf below Nexora IA",
    pattern:
      /NexoraIAEntry[\s\S]{0,500}SidebarLeaf[\s\S]{0,200}settingsLeaf/,
  },
  {
    label: "settings leaf label is literally 'Configuración'",
    pattern: /settingsLeaf:\s*NavLeaf[\s\S]{0,200}label:\s*"Configuración"/,
  },
  {
    label: "settings leaf links to the dedicated settings page",
    pattern: /settingsLeaf:\s*NavLeaf[\s\S]{0,200}href:\s*"\/admin\/settings"/,
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

// The overview page lists real category pages — each card link points
// into /admin/settings/<slug>. Those are the hrefs that must show up;
// older routes (/admin/billing, /admin/fiscal/settings, …) now live
// inside each category page, not in the overview.
const mustBeInSettings = [
  '"/admin/settings/pagos"',
  '"/admin/settings/dominios"',
  '"/admin/settings/legal"',
  '"/admin/settings/comunicacion"',
  '"/admin/settings/plan"',
  '"/admin/settings/integraciones"',
];

// Removed settings categories: must NOT appear in the overview.
// `Finanzas y retiros` was retired because Nexora has no internal
// payouts pipeline backing it; the smoke catches accidental revivals.
const mustNotBeInSettings = [
  '"/admin/settings/finanzas"',
];
for (const needle of mustBeInSettings) {
  if (settings.includes(needle)) {
    ok(`settings overview links to category: ${needle}`);
  } else {
    fail(`settings overview links to category: ${needle}`, "missing");
  }
}
for (const needle of mustNotBeInSettings) {
  if (settings.includes(needle)) {
    fail(
      `settings overview no longer links to retired category: ${needle}`,
      "the retired card is back",
    );
  } else {
    ok(`settings overview no longer links to retired category: ${needle}`);
  }
}

// ─── Step 4 · Sidebar duplication guard ──────────────────────────────
//
// Configuración is a SINGLE leaf in the sidebar pointing at /admin/settings.
// Sub-routes of /admin/settings must NOT appear in the global sidebar —
// they live inside the settings page's own right-nav. We only assert
// /admin/settings appears exactly once (settingsLeaf). Everything else
// that used to live in the sidebar settings group (plan, legal,
// integrations, …) is intentionally absent now.
const duplicateFinder = ["/admin/settings"];
for (const route of duplicateFinder) {
  // Count against the comment-stripped shell so a doc comment that
  // references the route doesn't inflate the occurrence count.
  const occurrencesInShell = (
    shell.match(new RegExp(route.replace(/\//g, "\\/"), "g")) || []
  ).length;
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

// Global sidebar must NOT expose any /admin/settings/<sub-route>.
// The shell points at /admin/settings only; subcategories are the
// settings page's own responsibility.
const forbiddenSubroutes = [
  "/admin/settings/pagos",
  "/admin/settings/dominios",
  "/admin/settings/legal",
  "/admin/settings/comunicacion",
  "/admin/settings/plan",
  "/admin/settings/integraciones",
];
for (const route of forbiddenSubroutes) {
  if (shellRaw.includes(route)) {
    fail(
      `sidebar does not surface settings subroutes`,
      `sidebar references ${route}`,
    );
  } else {
    ok(`sidebar does not surface settings subroutes: ${route}`);
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
