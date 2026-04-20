import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  CircleDashed,
  MessageCircle,
  Package,
  RotateCcw,
  Star,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { AppState, GrowthSnapshot } from "@/lib/growth/signals";

// ─── Growth / lifecycle hub UI ──────────────────────────────────────────
//
// Pure presentation layer. Receives a fully-computed snapshot and
// renders:
//   1. A top row with customer-base distribution (real counts).
//   2. A lifecycle band showing delivered vs reviewed vs cron-eligible.
//   3. A grid of app cards — each card reflects honest state
//      (active / needs_setup / not_installed / disabled) with a
//      concrete CTA linking to the existing admin surface.
//
// No invented metrics. No "customer health score". No sparklines with
// random noise. Every number comes from the snapshot and every CTA
// points at a real /admin route.

interface GrowthPageProps {
  snapshot: GrowthSnapshot;
}

const appStateMeta: Record<
  AppState,
  { label: string; tone: "positive" | "warning" | "muted" | "danger" }
> = {
  active: { label: "Activo", tone: "positive" },
  needs_setup: { label: "Requiere configuración", tone: "warning" },
  not_installed: { label: "No instalada", tone: "muted" },
  disabled: { label: "Desactivada", tone: "muted" },
};

const toneStyles: Record<"positive" | "warning" | "muted" | "danger", string> = {
  positive:
    "bg-[var(--surface-2)] text-[color:var(--signal-success)] border-[color:var(--hairline)]",
  warning:
    "bg-[var(--surface-2)] text-[color:var(--signal-warning)] border-[color:var(--hairline)]",
  danger:
    "bg-[var(--surface-2)] text-[color:var(--signal-danger)] border-[color:var(--hairline)]",
  muted: "bg-[var(--surface-2)] text-ink-5 border-[color:var(--hairline)]",
};

function StateChip({ state }: { state: AppState }) {
  const meta = appStateMeta[state];
  return (
    <span
      className={
        "inline-flex items-center rounded-[var(--r-xs)] border px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.18em] " +
        toneStyles[meta.tone]
      }
    >
      {meta.label}
    </span>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-5">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-ink-0 sm:text-[26px]">
        {title}
      </h2>
      <p className="mt-2 text-[13px] leading-[1.55] text-ink-5">{description}</p>
    </div>
  );
}

function MetricTile({
  label,
  value,
  caption,
  href,
}: {
  label: string;
  value: string | number;
  caption?: string;
  href?: string;
}) {
  const inner = (
    <div className="flex h-full flex-col justify-between rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5 shadow-[var(--shadow-soft)] transition-[border-color,box-shadow] hover:border-[color:var(--hairline-strong)]">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-5">
        {label}
      </p>
      <div className="mt-4">
        <p className="text-[28px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-ink-0">
          {value}
        </p>
        {caption && (
          <p className="mt-2 text-[12px] leading-[1.4] text-ink-5">{caption}</p>
        )}
      </div>
    </div>
  );
  if (!href) return inner;
  return (
    <Link
      href={href}
      className="block h-full focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
    >
      {inner}
    </Link>
  );
}

interface GrowthCardProps {
  icon: LucideIcon;
  title: string;
  state: AppState;
  primaryMetric: { label: string; value: string | number };
  secondaryMetric?: { label: string; value: string | number };
  rule?: string;
  cta: { label: string; href: string };
  notice?: string;
}

function GrowthCard({
  icon: Icon,
  title,
  state,
  primaryMetric,
  secondaryMetric,
  rule,
  cta,
  notice,
}: GrowthCardProps) {
  return (
    <div className="flex h-full flex-col rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]"
          >
            <Icon className="h-4 w-4 text-ink-3" strokeWidth={1.75} />
          </span>
          <p className="text-[14px] font-semibold text-ink-0">{title}</p>
        </div>
        <StateChip state={state} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-5">
            {primaryMetric.label}
          </p>
          <p className="mt-1.5 text-[22px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-ink-0">
            {primaryMetric.value}
          </p>
        </div>
        {secondaryMetric && (
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-5">
              {secondaryMetric.label}
            </p>
            <p className="mt-1.5 text-[22px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-ink-0">
              {secondaryMetric.value}
            </p>
          </div>
        )}
      </div>

      {rule && (
        <p className="mt-4 rounded-[var(--r-xs)] border border-dashed border-[color:var(--hairline)] bg-[var(--surface-1)] px-3 py-2 text-[11.5px] leading-[1.5] text-ink-5">
          {rule}
        </p>
      )}

      {notice && (
        <div className="mt-4 flex items-start gap-2 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-3 py-2.5 text-[12px] leading-[1.5] text-ink-4">
          <CircleAlert
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--signal-warning)]"
            strokeWidth={2}
          />
          <span>{notice}</span>
        </div>
      )}

      <div className="mt-auto pt-5">
        <Link
          href={cta.href}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-4 text-[12.5px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-1)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
        >
          {cta.label}
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
        </Link>
      </div>
    </div>
  );
}

export function GrowthPage({ snapshot }: GrowthPageProps) {
  const { customers, lifecycle, reorder, apps } = snapshot;

  // Per-block "is there anything to show?" flags. The hub never fakes
  // data; when a block has nothing real to report we surface the empty
  // state explicitly so the merchant understands why.
  const hasAnyCustomer = customers.total > 0;

  // Lifecycle ratio — purely descriptive, not a score. If there are
  // zero delivered orders in the window, we show a dash instead of
  // dividing by zero.
  const reviewRatio =
    lifecycle.deliveredInWindow > 0
      ? Math.round(
          (lifecycle.reviewsApprovedInWindow / lifecycle.deliveredInWindow) *
            100,
        )
      : null;

  return (
    <div className="animate-in fade-in space-y-12 pb-32 duration-700">
      <header className="flex flex-col gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-5">
          Crecimiento
        </p>
        <h1 className="text-[32px] font-bold leading-[1.05] tracking-[-0.03em] text-ink-0 sm:text-[36px]">
          Ciclo de vida y retención.
        </h1>
        <p className="max-w-3xl text-[14px] leading-[1.6] text-ink-4 sm:text-[15px]">
          Una lectura honesta de tus clientes y de cómo Nexora los está
          acompañando después de la compra. Todos los números salen de tu
          base real: pedidos, reseñas, flujos configurados y apps
          instaladas. Sin scores inventados.
        </p>
      </header>

      {/* ── Base de clientes ─────────────────────────────────────── */}
      <section className="space-y-6">
        <SectionHeader
          eyebrow="Base"
          title="Composición de tu base de clientes"
          description="Segmentos derivados de pedidos pagados en esta tienda. Cada tile llega directo al listado filtrado."
        />

        {!hasAnyCustomer ? (
          <div className="rounded-[var(--r-md)] border border-dashed border-[color:var(--hairline)] bg-[var(--surface-0)] px-6 py-10 text-center shadow-[var(--shadow-soft)]">
            <Users
              className="mx-auto h-6 w-6 text-ink-5"
              strokeWidth={1.75}
              aria-hidden
            />
            <p className="mt-3 text-[14px] font-semibold text-ink-0">
              Todavía no tenés clientes registrados
            </p>
            <p className="mt-1.5 text-[12.5px] text-ink-5">
              La base se arma automáticamente con cada pedido pagado.
            </p>
            <Link
              href="/admin/orders"
              className="mt-5 inline-flex h-10 items-center justify-center gap-1.5 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-4 text-[12.5px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-1)]"
            >
              Ver pedidos
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <MetricTile
              label="Total"
              value={customers.total}
              caption={`${customers.newLast30Days} nuevos últ. 30 días`}
              href="/admin/customers"
            />
            <MetricTile
              label="Nuevos"
              value={customers.new}
              caption="1 sola compra"
              href="/admin/customers"
            />
            <MetricTile
              label="Recurrentes"
              value={customers.recurring}
              caption="2 o más compras"
              href="/admin/customers"
            />
            <MetricTile
              label="VIP"
              value={customers.vip}
              caption="> 3 compras o alto gasto"
              href="/admin/customers"
            />
            <MetricTile
              label="Inactivos"
              value={customers.inactive}
              caption="≥ 90 días sin comprar"
              href="/admin/customers"
            />
          </div>
        )}
      </section>

      {/* ── Lifecycle post-compra ─────────────────────────────────── */}
      <section className="space-y-6">
        <SectionHeader
          eyebrow="Post-compra"
          title={`Qué pasa después de la entrega · últimos ${lifecycle.windowDays} días`}
          description="Cruza pedidos entregados con reseñas aprobadas y muestra exactamente qué órdenes dispararían los flujos post-compra en su próxima corrida."
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricTile
            label="Pedidos entregados"
            value={lifecycle.deliveredInWindow}
            caption={`Ventana de ${lifecycle.windowDays} días`}
            href="/admin/orders"
          />
          <MetricTile
            label="Reseñas aprobadas"
            value={lifecycle.reviewsApprovedInWindow}
            caption={
              reviewRatio != null
                ? `${reviewRatio}% sobre pedidos entregados`
                : "Sin pedidos entregados en la ventana"
            }
            href="/admin/apps/product-reviews"
          />
          <MetricTile
            label="Review-request a enviar"
            value={lifecycle.reviewRequestEligibleNow}
            caption={`Entregados hace ≥ ${lifecycle.reviewDelayDays} días sin aviso`}
            href="/admin/apps/post-purchase-flows/setup"
          />
          <MetricTile
            label="Reorder follow-up a enviar"
            value={lifecycle.reorderFollowupEligibleNow}
            caption={`Entregados hace ≥ ${lifecycle.reorderDelayDays} días sin aviso`}
            href="/admin/apps/post-purchase-flows/setup"
          />
        </div>
      </section>

      {/* ── Oportunidad de recompra ─────────────────────────────── */}
      <section className="space-y-6">
        <SectionHeader
          eyebrow="Recompra"
          title="Clientes con cadencia cumplida"
          description="Regla explícita, sin inferencias: recurrentes que pasaron el umbral que vos mismo configuraste para el follow-up de reorder."
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2fr]">
          <MetricTile
            label="Clientes elegibles"
            value={reorder.eligibleCount}
            caption={`Umbral: ${reorder.thresholdDays} días`}
            href="/admin/customers"
          />
          <div className="flex flex-col justify-center gap-3 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5 shadow-[var(--shadow-soft)]">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-5">
              Regla aplicada
            </p>
            <p className="text-[13px] leading-[1.55] text-ink-3">
              {reorder.ruleLabel}
            </p>
            <p className="text-[12px] leading-[1.5] text-ink-5">
              Podés ajustar el umbral desde la configuración de flujos
              post-compra. No hay modelos ni predicciones: si un cliente
              cruza ese umbral y tuvo al menos dos compras, entra acá.
            </p>
          </div>
        </div>
      </section>

      {/* ── Apps de retención ────────────────────────────────────── */}
      <section className="space-y-6">
        <SectionHeader
          eyebrow="Apps"
          title="Palancas de retención conectadas"
          description="Estado real de cada app post-compra y atajos directos a configurarlas."
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <GrowthCard
            icon={Star}
            title="Reseñas de producto"
            state={apps.productReviews.state}
            primaryMetric={{
              label: "Pendientes",
              value: apps.productReviews.pendingModeration,
            }}
            secondaryMetric={{
              label: "Aprobadas",
              value: apps.productReviews.approvedTotal,
            }}
            rule={
              apps.productReviews.state === "not_installed"
                ? "Instalá la app de reseñas para empezar a recolectar social proof real."
                : undefined
            }
            cta={{
              label:
                apps.productReviews.pendingModeration > 0
                  ? "Moderar pendientes"
                  : "Abrir reseñas",
              href:
                apps.productReviews.state === "not_installed"
                  ? "/admin/apps/product-reviews"
                  : "/admin/apps/product-reviews",
            }}
          />

          <GrowthCard
            icon={RotateCcw}
            title="Flujos post-compra"
            state={apps.postPurchase.state}
            primaryMetric={{
              label: "Review request",
              value: apps.postPurchase.reviewRequestEnabled
                ? `On · ${apps.postPurchase.reviewDelayDays}d`
                : "Off",
            }}
            secondaryMetric={{
              label: "Reorder follow-up",
              value: apps.postPurchase.reorderFollowupEnabled
                ? `On · ${apps.postPurchase.reorderDelayDays}d`
                : "Off",
            }}
            notice={
              apps.postPurchase.state !== "active"
                ? "La app está instalada pero no hay ningún flujo activo. Ningún email post-compra se dispara hoy."
                : !apps.postPurchase.reviewRequestEnabled &&
                    !apps.postPurchase.reorderFollowupEnabled
                  ? "Todos los flujos están apagados."
                  : undefined
            }
            cta={{
              label: "Configurar flujos",
              href: "/admin/apps/post-purchase-flows/setup",
            }}
          />

          <GrowthCard
            icon={MessageCircle}
            title="Recuperación por WhatsApp"
            state={apps.whatsappRecovery.state}
            primaryMetric={{
              label: "Conexión",
              value: apps.whatsappRecovery.configured ? "Configurada" : "Faltante",
            }}
            rule="Mensajes template a carritos abandonados. Requiere phone number ID, access token y template aprobado."
            cta={{
              label:
                apps.whatsappRecovery.state === "active"
                  ? "Abrir configuración"
                  : "Configurar WhatsApp",
              href: "/admin/apps/whatsapp-recovery",
            }}
          />

          <GrowthCard
            icon={Package}
            title="Bundles y upsells"
            state={apps.bundlesUpsells.state}
            primaryMetric={{
              label: "Ofertas activas",
              value: apps.bundlesUpsells.activeOffers,
            }}
            rule="Cada bundle activo se muestra en la PDP del producto disparador cuando hay al menos un producto en stock."
            cta={{
              label:
                apps.bundlesUpsells.state === "active"
                  ? "Administrar bundles"
                  : "Abrir app",
              href: "/admin/apps/bundles-upsells",
            }}
            notice={
              apps.bundlesUpsells.state === "active" &&
              apps.bundlesUpsells.activeOffers === 0
                ? "La app está activa pero no hay ninguna oferta publicada todavía."
                : undefined
            }
          />

          <GrowthCard
            icon={Truck}
            title="Seguimiento de envío"
            state={apps.orderTracking.state}
            primaryMetric={{
              label: "Widget",
              value:
                apps.orderTracking.state === "active"
                  ? "Visible"
                  : "Oculto",
            }}
            rule="Cuando está activo, el comprador puede ver el estado de su envío desde /tracking sin abrir un ticket."
            cta={{
              label:
                apps.orderTracking.state === "active"
                  ? "Abrir app"
                  : "Instalar",
              href: "/admin/apps/order-tracking-widget",
            }}
          />

          <GrowthCard
            icon={Users}
            title="Base de clientes"
            state={hasAnyCustomer ? "active" : "needs_setup"}
            primaryMetric={{
              label: "Recurrentes",
              value: customers.recurring + customers.vip,
            }}
            secondaryMetric={{
              label: "En riesgo",
              value: customers.inactive,
            }}
            rule="El tab completo incluye última compra, ticket medio y segmento. Clic en una fila lleva directo a sus pedidos."
            cta={{
              label: "Ir a clientes",
              href: "/admin/customers",
            }}
          />
        </div>
      </section>

      {/* ── Health footer ─────────────────────────────────────────── */}
      <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            {isGrowthHealthy(apps) ? (
              <CheckCircle2
                className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--signal-success)]"
                strokeWidth={1.75}
              />
            ) : (
              <CircleDashed
                className="mt-0.5 h-5 w-5 shrink-0 text-ink-5"
                strokeWidth={1.75}
              />
            )}
            <div>
              <p className="text-[13px] font-semibold text-ink-0">
                {isGrowthHealthy(apps)
                  ? "Palancas de retención en marcha"
                  : "Hay palancas apagadas"}
              </p>
              <p className="mt-0.5 text-[12px] leading-[1.5] text-ink-5">
                {isGrowthHealthy(apps)
                  ? "Las apps de retención están activas y los flujos configurados se ejecutan en las próximas corridas del cron."
                  : "Al menos una app clave no está activa. Activar flujos post-compra y reseñas es el camino más corto a más recompra real."}
              </p>
            </div>
          </div>
          <Link
            href="/admin/apps"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-4 text-[12.5px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-1)]"
          >
            Ver todas las apps
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
          </Link>
        </div>
      </section>
    </div>
  );
}

function isGrowthHealthy(apps: GrowthSnapshot["apps"]): boolean {
  // "Healthy" is a terse, transparent rule: product-reviews AND
  // post-purchase-flows are both active with at least one flow turned
  // on. WhatsApp is optional because many tenants won't configure
  // Meta's WABA — we don't want to nag them forever.
  return (
    apps.productReviews.state === "active" &&
    apps.postPurchase.state === "active" &&
    (apps.postPurchase.reviewRequestEnabled ||
      apps.postPurchase.reorderFollowupEnabled)
  );
}
