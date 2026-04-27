"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  ImageOff,
  FileWarning,
  Package,
  ShoppingCart,
  TrendingUp,
  Wrench,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { MarketToolsSnapshot } from "@/lib/tools/queries";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";

// ─── Market Tools Hub ───────────────────────────────────────────────────
// Curated tools layer for ecommerce merchants. Every tool shows real DB
// data with actionable output. No scores, no predictions, no filler.

interface Props {
  snapshot: MarketToolsSnapshot;
}

export function MarketToolsHub({ snapshot }: Props) {
  const { catalogHealth, storefrontContent, ordersAttention, growthOpportunities, paymentCheckout } = snapshot;

  // Count total issues across all tools for the header
  const catalogIssues = catalogHealth.withoutImage + catalogHealth.withoutDescription + catalogHealth.withZeroPrice + catalogHealth.withoutStock;
  const contentIssues = storefrontContent.sectionsWithIssues.filter((i) => i.severity === "warning").length;
  const orderIssues = ordersAttention.unfulfilledOver48h + ordersAttention.withoutTracking;
  const growthActions = growthOpportunities.actions.length;
  const totalIssues = catalogIssues + contentIssues + orderIssues + growthActions + (paymentCheckout.hasCheckoutCapability ? 0 : 1);

  return (
    <div className="animate-in fade-in space-y-8 pb-32 duration-700">
      <AdminPageHeader
        eyebrow="Herramientas · operación"
        title="Herramientas"
        subtitle="Utilidades operativas, scripts y automatizaciones internas. Todo el toolkit Nexora en un solo lugar."
      />
      <div className="-mt-2 flex">
        {totalIssues > 0 ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[color:var(--signal-warning)]/30 bg-[color:var(--signal-warning)]/10 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--signal-warning)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--signal-warning)]" />
            {totalIssues} {totalIssues === 1 ? "acción pendiente" : "acciones pendientes"}
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[color:var(--signal-success)]/30 bg-[color:var(--signal-success)]/10 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--signal-success)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--signal-success)]" />
            Todo en orden
          </span>
        )}
      </div>

      {/* Tools grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* ─── Tool 1: Catalog Health ─── */}
        <ToolCard
          icon={<Package className="h-4 w-4" strokeWidth={1.75} />}
          title="Salud del catálogo"
          description="Productos publicados con datos incompletos que afectan conversión."
          issueCount={catalogIssues}
          href="/admin/catalog"
          ctaLabel="Ir a Catálogo"
        >
          <div className="space-y-2">
            <MetricRow
              label="Publicados totales"
              value={catalogHealth.totalPublished}
              ok
            />
            <MetricRow
              label="Sin imagen"
              value={catalogHealth.withoutImage}
              ok={catalogHealth.withoutImage === 0}
              icon={<ImageOff className="h-3.5 w-3.5" />}
            />
            <MetricRow
              label="Sin descripción"
              value={catalogHealth.withoutDescription}
              ok={catalogHealth.withoutDescription === 0}
              icon={<FileWarning className="h-3.5 w-3.5" />}
            />
            <MetricRow
              label="Precio ≤ $0"
              value={catalogHealth.withZeroPrice}
              ok={catalogHealth.withZeroPrice === 0}
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
            />
            <MetricRow
              label="Sin stock vendible"
              value={catalogHealth.withoutStock}
              ok={catalogHealth.withoutStock === 0}
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
            />
          </div>
          {catalogHealth.samples.noImage.length > 0 && (
            <SampleList
              label="Sin imagen"
              items={catalogHealth.samples.noImage}
            />
          )}
          {catalogHealth.samples.zeroPrice.length > 0 && (
            <SampleList
              label="Precio $0"
              items={catalogHealth.samples.zeroPrice}
            />
          )}
        </ToolCard>

        {/* ─── Tool 2: Storefront Content ─── */}
        <ToolCard
          icon={<Eye className="h-4 w-4" strokeWidth={1.75} />}
          title="Contenido del storefront"
          description="Secciones del home y elementos de conversión faltantes."
          issueCount={contentIssues}
          href="/admin/store-ai/editor"
          ctaLabel="Editar secciones"
        >
          <div className="space-y-2">
            <MetricRow label="Secciones totales" value={storefrontContent.totalSections} ok />
            <MetricRow
              label="Secciones ocultas"
              value={storefrontContent.hiddenSections}
              ok={storefrontContent.hiddenSections === 0}
              icon={<EyeOff className="h-3.5 w-3.5" />}
            />
            <MetricRow
              label="Hero presente"
              value={storefrontContent.hasHero ? "Sí" : "No"}
              ok={storefrontContent.hasHero}
            />
            <MetricRow
              label="Hero con titular"
              value={storefrontContent.heroHasHeadline ? "Sí" : "No"}
              ok={storefrontContent.heroHasHeadline}
            />
            <MetricRow
              label="Hero con CTA"
              value={storefrontContent.heroHasCTA ? "Sí" : "No"}
              ok={storefrontContent.heroHasCTA}
            />
          </div>
          {storefrontContent.sectionsWithIssues.filter((i) => i.severity === "warning").length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Problemas detectados</p>
              {storefrontContent.sectionsWithIssues
                .filter((i) => i.severity === "warning")
                .map((issue, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-[12px] text-[color:var(--signal-warning)]">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    <span className="font-medium">{blockLabel(issue.blockType)}:</span>
                    <span className="text-ink-5">{issue.issue}</span>
                  </div>
                ))}
            </div>
          )}
        </ToolCard>

        {/* ─── Tool 3: Orders Attention ─── */}
        <ToolCard
          icon={<ShoppingCart className="h-4 w-4" strokeWidth={1.75} />}
          title="Pedidos que requieren atención"
          description="Pedidos sin cumplir, sin tracking o con pago pendiente."
          issueCount={orderIssues}
          href="/admin/orders"
          ctaLabel="Ir a Pedidos"
        >
          <div className="space-y-2">
            <MetricRow label="Sin cumplir" value={ordersAttention.unfulfilled} ok={ordersAttention.unfulfilled === 0} />
            <MetricRow
              label="Sin cumplir >48h"
              value={ordersAttention.unfulfilledOver48h}
              ok={ordersAttention.unfulfilledOver48h === 0}
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
            />
            <MetricRow
              label="Enviados sin tracking"
              value={ordersAttention.withoutTracking}
              ok={ordersAttention.withoutTracking === 0}
            />
            <MetricRow
              label="Pago pendiente"
              value={ordersAttention.unpaid}
              ok={ordersAttention.unpaid === 0}
            />
          </div>
          {ordersAttention.samples.unfulfilled.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Próximos a atender</p>
              {ordersAttention.samples.unfulfilled.slice(0, 5).map((o) => (
                <Link key={o.id} href={`/admin/orders`} className="flex items-center gap-2 text-[12px] text-ink-3 hover:text-ink-0">
                  <span className="font-mono text-ink-5">#{o.orderNumber}</span>
                  <span className="text-ink-6">·</span>
                  <span className="text-ink-5">{new Date(o.createdAt).toLocaleDateString("es-AR")}</span>
                </Link>
              ))}
            </div>
          )}
        </ToolCard>

        {/* ─── Tool 4: Recovery Opportunities ─── */}
        <ToolCard
          icon={<TrendingUp className="h-4 w-4" strokeWidth={1.75} />}
          title="Oportunidades de recuperación"
          description="Pagos pendientes, carritos parados, clientes para reactivar y recompra."
          issueCount={growthActions}
          href="/admin/recovery"
          ctaLabel="Ir a Recuperación"
        >
          <div className="space-y-2">
            <MetricRow
              label="Entregados sin pedido de reseña"
              value={growthOpportunities.deliveredWithoutReviewRequest}
              ok={growthOpportunities.deliveredWithoutReviewRequest === 0}
            />
            <MetricRow
              label="Clientes listos para recompra"
              value={growthOpportunities.customersReadyForReorder}
              ok={growthOpportunities.customersReadyForReorder === 0}
            />
            <MetricRow
              label="Reseñas por moderar"
              value={growthOpportunities.reviewsPendingModeration}
              ok={growthOpportunities.reviewsPendingModeration === 0}
            />
            <MetricRow
              label="Apps de retención sin instalar"
              value={growthOpportunities.appsNotInstalled.length}
              ok={growthOpportunities.appsNotInstalled.length === 0}
            />
          </div>
          {growthOpportunities.actions.length > 0 && (
            <div className="mt-3 space-y-1.5">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Acciones recomendadas</p>
              {growthOpportunities.actions.map((action) => (
                <Link key={action.id} href={action.href} className="group flex items-center justify-between gap-3 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-3 py-2 transition-colors hover:bg-[var(--surface-2)]">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-ink-0">{action.title}</p>
                    <p className="truncate text-[11px] text-ink-5">{action.description}</p>
                  </div>
                  <span className="shrink-0 text-[11px] font-medium text-ink-3 group-hover:text-ink-0">
                    {action.ctaLabel} →
                  </span>
                </Link>
              ))}
            </div>
          )}
        </ToolCard>

        {/* ─── Tool 5: Payment & Checkout ─── */}
        <ToolCard
          icon={<CreditCard className="h-4 w-4" strokeWidth={1.75} />}
          title="Checkout y pagos"
          description="Estado real de la capacidad de cobro de tu tienda."
          issueCount={paymentCheckout.hasCheckoutCapability ? 0 : 1}
          href="/admin/store?tab=pagos"
          ctaLabel="Ir a Pagos"
          fullWidth
        >
          <div className="space-y-2">
            <MetricRow
              label="Mercado Pago conectado"
              value={paymentCheckout.mpConnected ? "Sí" : "No"}
              ok={paymentCheckout.mpConnected}
            />
            {paymentCheckout.mpAccountId && (
              <MetricRow label="Cuenta MP" value={paymentCheckout.mpAccountId} ok />
            )}
            <MetricRow
              label="Tienda publicada"
              value={paymentCheckout.storePublished ? "Sí" : "No"}
              ok={paymentCheckout.storePublished}
            />
            <MetricRow
              label="Checkout operativo"
              value={paymentCheckout.hasCheckoutCapability ? "Activo" : "Bloqueado"}
              ok={paymentCheckout.hasCheckoutCapability}
            />
            {paymentCheckout.mpNeedsReconnection && (
              <div className="flex items-center gap-2 rounded-[var(--r-sm)] bg-[color:var(--signal-danger)]/10 px-3 py-2 text-[12px] text-[color:var(--signal-danger)]">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Mercado Pago necesita reconexión
              </div>
            )}
          </div>
        </ToolCard>
      </div>
    </div>
  );
}

// ─── Shared components ───────────────────────────────────────────────────

function ToolCard({
  icon,
  title,
  description,
  issueCount,
  href,
  ctaLabel,
  children,
  fullWidth = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  issueCount: number;
  href: string;
  ctaLabel: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className={cn(
      "flex flex-col rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)]",
      fullWidth && "lg:col-span-2",
    )}>
      {/* Card header */}
      <div className="flex items-start justify-between gap-4 border-b border-[color:var(--hairline)] px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] text-ink-3">
            {icon}
          </div>
          <div className="min-w-0">
            <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-ink-0">{title}</h3>
            <p className="mt-0.5 text-[12px] text-ink-5">{description}</p>
          </div>
        </div>
        {issueCount > 0 ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-[var(--r-xs)] bg-[color:var(--signal-warning)]/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[color:var(--signal-warning)]">
            {issueCount}
          </span>
        ) : (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[color:var(--signal-success)]" strokeWidth={2} />
        )}
      </div>

      {/* Card body */}
      <div className="flex-1 px-5 py-4">{children}</div>

      {/* Card footer */}
      <div className="border-t border-[color:var(--hairline)] px-5 py-3">
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-3 transition-colors hover:text-ink-0"
        >
          {ctaLabel}
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
        </Link>
      </div>
    </div>
  );
}

function MetricRow({
  label,
  value,
  ok,
  icon,
}: {
  label: string;
  value: number | string;
  ok: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        {icon && <span className={cn("shrink-0", ok ? "text-ink-6" : "text-[color:var(--signal-warning)]")}>{icon}</span>}
        <span className="truncate text-[12px] text-ink-5">{label}</span>
      </div>
      <span className={cn("shrink-0 font-mono text-[12px] font-semibold tabular-nums", ok ? "text-ink-0" : "text-[color:var(--signal-warning)]")}>
        {value}
      </span>
    </div>
  );
}

function SampleList({
  label,
  items,
}: {
  label: string;
  items: Array<{ id: string; title: string; handle: string }>;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3 space-y-1">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">{label}</p>
      {items.slice(0, 5).map((p) => (
        <Link key={p.id} href="/admin/catalog" className="flex items-center gap-2 text-[12px] text-ink-3 hover:text-ink-0">
          <span className="truncate">{p.title}</span>
          <span className="shrink-0 font-mono text-[10px] text-ink-6">{p.handle}</span>
        </Link>
      ))}
      {items.length > 5 && (
        <p className="text-[11px] text-ink-6">y {items.length - 5} más…</p>
      )}
    </div>
  );
}

function blockLabel(blockType: string): string {
  const labels: Record<string, string> = {
    hero: "Hero",
    featured_products: "Productos destacados",
    featured_categories: "Categorías",
    benefits: "Beneficios",
    testimonials: "Testimonios",
    faq: "FAQ",
    newsletter: "Newsletter",
  };
  return labels[blockType] ?? blockType;
}
