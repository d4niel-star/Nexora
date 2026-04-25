// ─── Diagnóstico de tienda ──────────────────────────────────────────────
//
// Sub-surface of Estadísticas. Replaces the old "Finanzas" tab whose
// content had no analytical coherence inside Estadísticas (it was
// already covered by Pagos + Rendimiento + the legacy /admin/finances
// surface).
//
// Diagnóstico does NOT show metrics. Its job is to answer three
// concrete merchant questions:
//
//   1. "¿qué está mal hoy?"            → critical / sales blockers
//   2. "¿qué está bloqueando ventas?"  → conversion warnings + stock
//   3. "¿dónde lo arreglo?"            → every signal carries an href
//
// To keep the data source honest, this module is a *thin aggregator*
// over signals that already exist in the codebase:
//
//   - getStoreReadinessSnapshot()  → publication / sales / conversion
//                                    blockers + recommendations
//                                    (perfil, MP, products, branding,
//                                    catálogo)
//   - getHealthCenterData()        → integrations health (ads, sourcing,
//                                    Mercado Pago tokens, sync jobs)
//   - prisma stock counts           → real out-of-stock and low-stock
//                                    counts on published products
//
// Nothing is invented. Every issue carries the exact href its owning
// surface uses, so clicking on a Diagnóstico row leads the merchant
// directly to where they can resolve it.

import { prisma } from "@/lib/db/prisma";
import {
  getStoreReadinessSnapshot,
  type ReadinessCheck,
  type ReadinessSnapshot,
} from "@/lib/readiness/snapshot";
import { getHealthCenterData } from "@/lib/integrations/health";
import type { HealthSignal, HealthSeverity } from "@/types/health";

/** Threshold (units) below which a tracked variant is "low stock". */
const LOW_STOCK_THRESHOLD = 3;

/**
 * Severity is shared across readiness checks, integration signals and
 * stock alerts so the UI can sort/group them uniformly.
 *
 *   critical → blocks sales right now (cannot publish, cannot cobrar,
 *              integraciones rotas que afectan operación)
 *   high     → bloquea conversión real (catálogo sin imágenes / sin
 *              precio válido / token por vencer)
 *   normal   → recomendación operativa de bajo riesgo
 *   info     → todo OK / informativo
 */
export type DiagnosticSeverity = "critical" | "high" | "normal" | "info";

export type DiagnosticCategory =
  | "publication"
  | "payments"
  | "catalog"
  | "stock"
  | "integrations"
  | "branding"
  | "recommendation";

export interface DiagnosticIssue {
  id: string;
  severity: DiagnosticSeverity;
  category: DiagnosticCategory;
  title: string;
  description: string;
  /** Optional extra context, e.g. "3 productos sin imagen". */
  detail?: string;
  href: string;
  ctaLabel: string;
  /** Source aggregator — useful for analytics / debugging. */
  source: "readiness" | "integrations" | "stock";
}

export interface DiagnosticCounts {
  critical: number;
  high: number;
  normal: number;
  /** All resolved checks across every aggregator. */
  resolved: number;
}

export interface DiagnosticSnapshot {
  /** Aggregated state — drives the header pill + score copy. */
  status: "blocked" | "needs_attention" | "healthy";
  counts: DiagnosticCounts;
  /** Open issues, severity-sorted. */
  issues: DiagnosticIssue[];
  /** Resolved checks (kept so the UI can show "X cosas en orden"). */
  resolved: DiagnosticIssue[];
  /** First action the merchant should take, or null if nothing pending. */
  primaryAction: { label: string; href: string; reason: string } | null;
  /** ISO timestamp this snapshot was generated. */
  generatedAt: string;
}

// ─── Mappers ────────────────────────────────────────────────────────────

function readinessSeverityToDiagnostic(
  severity: ReadinessCheck["severity"],
): DiagnosticSeverity {
  switch (severity) {
    case "blocks_publication":
    case "blocks_sales":
      return "critical";
    case "blocks_conversion":
      return "high";
    case "recommendation":
    default:
      return "normal";
  }
}

function readinessCategory(check: ReadinessCheck): DiagnosticCategory {
  switch (check.id) {
    case "store_profile":
    case "store_active":
      return "publication";
    case "platform_mp_env":
    case "mp_connected":
      return "payments";
    case "sellable_product":
    case "products_with_price":
    case "products_have_images":
    case "products_have_description":
      return "catalog";
    case "branding_logo":
    case "branding_customized":
      return "branding";
    case "sourcing_connected":
      return "integrations";
    case "ai_draft_apply":
      return "recommendation";
    default:
      return "recommendation";
  }
}

function healthSeverityToDiagnostic(severity: HealthSeverity): DiagnosticSeverity {
  switch (severity) {
    case "critical":
      return "critical";
    case "high":
      return "high";
    case "normal":
      return "normal";
    case "info":
    default:
      return "info";
  }
}

function healthSignalToIssue(signal: HealthSignal): DiagnosticIssue {
  return {
    id: `health:${signal.id}`,
    severity: healthSeverityToDiagnostic(signal.severity),
    category: "integrations",
    title: signal.title,
    description: signal.description,
    href: signal.href,
    ctaLabel: signal.actionLabel,
    source: "integrations",
  };
}

function readinessToIssue(check: ReadinessCheck): DiagnosticIssue {
  return {
    id: `readiness:${check.id}`,
    severity: readinessSeverityToDiagnostic(check.severity),
    category: readinessCategory(check),
    title: check.title,
    description: check.description,
    detail: check.detail,
    href: check.href,
    ctaLabel: check.ctaLabel,
    source: "readiness",
  };
}

// ─── Stock signals ──────────────────────────────────────────────────────
// We don't reuse the full alerts engine (it lives elsewhere and is much
// broader); the merchant only needs to know "how many SKUs are out of
// stock or low" and where to fix them.

interface StockSummary {
  outOfStock: number;
  lowStock: number;
}

async function getStockSummary(storeId: string): Promise<StockSummary> {
  // Out of stock: a tracked variant with stock <= 0 and backorder NOT
  // allowed, on a product that is currently published and not archived.
  const [outOfStock, lowStock] = await Promise.all([
    prisma.productVariant.count({
      where: {
        product: { storeId, isPublished: true, status: { not: "archived" } },
        trackInventory: true,
        allowBackorder: false,
        stock: { lte: 0 },
      },
    }),
    prisma.productVariant.count({
      where: {
        product: { storeId, isPublished: true, status: { not: "archived" } },
        trackInventory: true,
        stock: { gt: 0, lte: LOW_STOCK_THRESHOLD },
      },
    }),
  ]).catch((error) => {
    console.error("[Diagnostics] stock summary query failed:", error);
    return [0, 0] as const;
  });

  return { outOfStock, lowStock };
}

function stockIssues(summary: StockSummary): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];

  if (summary.outOfStock > 0) {
    issues.push({
      id: "stock:out_of_stock",
      severity: "critical",
      category: "stock",
      title: "Productos publicados sin stock",
      description:
        "Variantes publicadas, con stock 0 y sin backorder habilitado: el comprador las ve pero no puede agregarlas al carrito.",
      detail: `${summary.outOfStock} variante${summary.outOfStock !== 1 ? "s" : ""} sin stock`,
      href: "/admin/inventory",
      ctaLabel: "Reponer inventario",
      source: "stock",
    });
  }

  if (summary.lowStock > 0) {
    issues.push({
      id: "stock:low_stock",
      severity: "high",
      category: "stock",
      title: "Variantes con stock bajo",
      description:
        "Variantes con stock por debajo del umbral de seguridad: van a quebrar pronto si no se reponen.",
      detail: `${summary.lowStock} variante${summary.lowStock !== 1 ? "s" : ""} ≤ ${LOW_STOCK_THRESHOLD} unidades`,
      href: "/admin/inventory",
      ctaLabel: "Planificar reposición",
      source: "stock",
    });
  }

  return issues;
}

function stockResolved(summary: StockSummary): DiagnosticIssue[] {
  // We only emit a "resolved" stock card when both counts are zero AND
  // the underlying query succeeded — otherwise we'd be claiming a
  // healthy state when we actually have no data.
  if (summary.outOfStock === 0 && summary.lowStock === 0) {
    return [
      {
        id: "stock:ok",
        severity: "info",
        category: "stock",
        title: "Stock al día",
        description:
          "Ninguna variante publicada está en cero y nada cae por debajo del umbral de seguridad.",
        href: "/admin/inventory",
        ctaLabel: "Ver inventario",
        source: "stock",
      },
    ];
  }
  return [];
}

// ─── Aggregator ─────────────────────────────────────────────────────────

const SEVERITY_RANK: Record<DiagnosticSeverity, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  info: 1,
};

export async function getDiagnosticSnapshot(
  storeId: string,
): Promise<DiagnosticSnapshot> {
  const [readiness, health, stock] = await Promise.all([
    getStoreReadinessSnapshot(storeId).catch((error) => {
      console.error("[Diagnostics] readiness snapshot failed:", error);
      return null as ReadinessSnapshot | null;
    }),
    getHealthCenterData().catch((error) => {
      console.error("[Diagnostics] integrations health failed:", error);
      return null;
    }),
    getStockSummary(storeId),
  ]);

  const issues: DiagnosticIssue[] = [];
  const resolved: DiagnosticIssue[] = [];

  // Readiness: split into open vs resolved so the UI can show "X cosas
  // en orden" without overwhelming the action list.
  if (readiness) {
    for (const check of readiness.checks) {
      const issue = readinessToIssue(check);
      if (check.resolved) {
        resolved.push({ ...issue, severity: "info" });
      } else {
        issues.push(issue);
      }
    }
  }

  // Integration health signals are always actionable when present.
  if (health) {
    for (const signal of health.signals) {
      issues.push(healthSignalToIssue(signal));
    }
  }

  issues.push(...stockIssues(stock));
  resolved.push(...stockResolved(stock));

  // De-duplicate by id (defensive: integration health currently re-uses
  // some MP signals that readiness also exposes).
  const seen = new Set<string>();
  const dedupedIssues = issues.filter((issue) => {
    const key = issue.title; // Title is the merchant-visible identity.
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  dedupedIssues.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);

  const counts: DiagnosticCounts = {
    critical: dedupedIssues.filter((i) => i.severity === "critical").length,
    high: dedupedIssues.filter((i) => i.severity === "high").length,
    normal: dedupedIssues.filter((i) => i.severity === "normal").length,
    resolved: resolved.length,
  };

  let status: DiagnosticSnapshot["status"];
  if (counts.critical > 0) status = "blocked";
  else if (counts.high > 0) status = "needs_attention";
  else status = "healthy";

  const top = dedupedIssues[0];
  const primaryAction = top
    ? { label: top.ctaLabel, href: top.href, reason: top.id }
    : null;

  return {
    status,
    counts,
    issues: dedupedIssues,
    resolved,
    primaryAction,
    generatedAt: new Date().toISOString(),
  };
}
