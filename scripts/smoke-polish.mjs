// ─── Smoke for cross-module polish consistency ──────────────────────────
// Grep-based verification that the shared EmptyState primitive is now
// used on the canonical surfaces listed in the polish brief, and that
// the dead CTAs that used to live in Orders / OrderDrawer are gone.
//
// Run:  npx tsx scripts/smoke-polish.mjs

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const checks = [
  {
    name: "EmptyState primitive exists",
    file: "src/components/ui/EmptyState.tsx",
    mustInclude: ["export function EmptyState", "EmptyStateAction"],
  },
  {
    name: "OrdersClient uses shared EmptyState",
    file: "src/app/admin/orders/OrdersClient.tsx",
    mustInclude: [
      'from "@/components/ui/EmptyState"',
      "<EmptyState",
      "Sin pedidos aún",
      "Sin resultados para este filtro",
    ],
    mustNotInclude: [
      // Dead header CTA button markup removed (prose in comments is fine)
      "> Exportar CSV",
      "Crear Pedido\n            </button>",
      // Import of the icon used for the Export button should also be gone
      "Download, Filter",
      // Old inline empty-state chrome must be replaced
      "No encontramos tu orden",
    ],
  },
  {
    name: "CustomersClient uses shared EmptyState",
    file: "src/components/admin/customers/CustomersClient.tsx",
    mustInclude: [
      'from "@/components/ui/EmptyState"',
      "<EmptyState",
      "Aún no hay clientes",
    ],
    mustNotInclude: [
      // Old custom heading style
      'text-xl font-bold text-ink-0">No hay clientes',
    ],
  },
  {
    name: "IntegrationsClient uses shared EmptyState",
    file: "src/components/admin/integrations/IntegrationsClient.tsx",
    mustInclude: [
      'from "@/components/ui/EmptyState"',
      "<EmptyState",
      "Sin integraciones en esta categoría",
    ],
    mustNotInclude: [
      // Old heading
      "No hay conexiones.",
    ],
  },
  {
    name: "ReviewsModeration uses shared EmptyState",
    file: "src/components/admin/apps/product-reviews/ReviewsModeration.tsx",
    mustInclude: [
      'from "@/components/ui/EmptyState"',
      "<EmptyState",
      "Nada por moderar ahora",
    ],
  },
  {
    name: "Bundles OfferList uses shared EmptyState",
    file: "src/components/admin/apps/bundles-upsells/OfferList.tsx",
    mustInclude: [
      'from "@/components/ui/EmptyState"',
      "<EmptyState",
      "No hay bundles todavía",
      "Crear bundle",
    ],
    mustNotInclude: [
      "No hay ofertas configuradas",
    ],
  },
  {
    name: "OrderDrawer header: dead icon buttons removed",
    file: "src/components/admin/orders/OrderDrawer.tsx",
    mustNotInclude: [
      "<Printer",
      "<MoreHorizontal",
      "Printer, UserCircle",
    ],
    mustInclude: [
      // Close button must still be there with proper aria-label
      'aria-label="Cerrar detalle del pedido"',
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

  let ok = true;
  const details = [];

  for (const needle of check.mustInclude || []) {
    if (!body.includes(needle)) {
      ok = false;
      details.push(`missing: ${JSON.stringify(needle)}`);
    }
  }
  for (const needle of check.mustNotInclude || []) {
    if (body.includes(needle)) {
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

console.log(`\n${passed}/${checks.length} surfaces consistent`);
process.exit(passed === checks.length ? 0 : 1);
