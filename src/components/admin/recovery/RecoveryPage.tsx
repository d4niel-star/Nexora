import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  Mail,
  MessageCircle,
  Recycle,
  ShoppingCart,
  Sparkles,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn, formatCurrency } from "@/lib/utils";
import type {
  AbandonedCartRow,
  InactiveCustomerRow,
  RecoverableOrderRow,
  RecoveryAppState,
  RecoveryLeversSnapshot,
  RecoverySnapshot,
  ReorderCandidateRow,
} from "@/lib/recovery/signals";

// ─── Recuperación — Ventas sub-surface ──────────────────────────────────
//
// Replaces the old Crecimiento hub. Crecimiento was a post-purchase
// lifecycle dashboard that overlapped with Estadísticas > Rendimiento;
// Recuperación deliberately answers a different question:
//
//   "¿qué dinero / clientes podemos recuperar HOY?"
//
// Every block is a real list pulled straight from the DB:
//   - pagos pendientes / fallidos       → /admin/orders detail
//   - carritos abandonados              → /admin/orders (filtered)
//   - clientes inactivos / en riesgo    → /admin/customers
//   - candidatos a recompra             → /admin/customers
//   - palancas (WhatsApp / emails)      → atajos a la configuración real
//
// No charts, no scores, no projections. Cada fila lleva al lugar exacto
// donde se opera la recuperación.

interface RecoveryPageProps {
  snapshot: RecoverySnapshot;
}

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatDate(iso: string): string {
  try {
    return dateFormatter.format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function maskEmail(email: string | null): string {
  if (!email) return "Sin email";
  const at = email.indexOf("@");
  if (at <= 1) return email;
  const head = email.slice(0, Math.min(2, at));
  const tail = email.slice(at);
  return `${head}…${tail}`;
}

const appStateMeta: Record<
  RecoveryAppState,
  { label: string; pillClass: string }
> = {
  active: {
    label: "Activa",
    pillClass:
      "bg-[color:color-mix(in_srgb,var(--signal-success)_14%,transparent)] text-[color:var(--signal-success)] ring-[color:color-mix(in_srgb,var(--signal-success)_28%,transparent)]",
  },
  needs_setup: {
    label: "Requiere configuración",
    pillClass:
      "bg-[color:color-mix(in_srgb,var(--signal-warning)_16%,transparent)] text-[color:var(--signal-warning)] ring-[color:color-mix(in_srgb,var(--signal-warning)_28%,transparent)]",
  },
  not_installed: {
    label: "No instalada",
    pillClass: "bg-[var(--surface-2)] text-ink-4 ring-[color:var(--hairline)]",
  },
  disabled: {
    label: "Apagada",
    pillClass: "bg-[var(--surface-2)] text-ink-5 ring-[color:var(--hairline)]",
  },
};

function SummaryTile({
  label,
  value,
  caption,
  icon: Icon,
  tone,
  href,
}: {
  label: string;
  value: string;
  caption?: string;
  icon: LucideIcon;
  tone: "danger" | "warning" | "muted" | "neutral";
  href?: string;
}) {
  const toneClass =
    tone === "danger"
      ? "text-[color:var(--signal-danger)]"
      : tone === "warning"
        ? "text-[color:var(--signal-warning)]"
        : tone === "muted"
          ? "text-ink-3"
          : "text-ink-0";
  const inner = (
    <div className="flex h-full flex-col gap-3 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5 shadow-[var(--shadow-soft)] transition-[border-color,box-shadow] hover:border-[color:var(--hairline-strong)]">
      <div className="flex items-center justify-between">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.18em] text-ink-5">
          {label}
        </p>
        <Icon className={cn("h-4 w-4", toneClass)} strokeWidth={1.75} />
      </div>
      <div>
        <p className={cn("text-[26px] font-semibold leading-none tracking-[-0.02em] tabular-nums", toneClass)}>
          {value}
        </p>
        {caption && (
          <p className="mt-2 text-[12px] leading-[1.45] text-ink-5">{caption}</p>
        )}
      </div>
    </div>
  );
  if (!href) return inner;
  return (
    <Link
      href={href}
      className="block focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
    >
      {inner}
    </Link>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  count,
}: {
  eyebrow: string;
  title: string;
  description: string;
  count?: number;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-5">
          {eyebrow}
        </p>
        <h2 className="mt-1.5 text-[18px] font-semibold tracking-[-0.02em] text-ink-0 sm:text-[20px]">
          {title}
        </h2>
        <p className="mt-1.5 text-[12.5px] leading-[1.5] text-ink-5">
          {description}
        </p>
      </div>
      {typeof count === "number" && (
        <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-[var(--surface-2)] px-3 py-1 text-[11px] font-semibold text-ink-3 ring-1 ring-inset ring-[color:var(--hairline)] sm:self-auto">
          {count} {count === 1 ? "ítem" : "ítems"}
        </span>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, title, copy }: { icon: LucideIcon; title: string; copy: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--r-md)] border border-dashed border-[color:var(--hairline)] bg-[var(--surface-0)] px-6 py-10 text-center">
      <Icon className="h-5 w-5 text-ink-5" strokeWidth={1.75} />
      <p className="text-[14px] font-semibold text-ink-0">{title}</p>
      <p className="max-w-sm text-[12.5px] leading-[1.5] text-ink-5">{copy}</p>
    </div>
  );
}

function OrderRow({
  row,
  ctaLabel,
}: {
  row: RecoverableOrderRow;
  ctaLabel: string;
}) {
  return (
    <li className="flex flex-col gap-3 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[12px] font-medium text-ink-2">
            {row.orderNumber || row.id.slice(0, 8)}
          </span>
          <span className="text-[11px] uppercase tracking-[0.16em] text-ink-5">
            {row.paymentStatus}
          </span>
          <span className="text-[11px] text-ink-5">
            {row.ageDays === 0 ? "hoy" : `hace ${row.ageDays}d`}
          </span>
        </div>
        <p className="mt-1 truncate text-[13.5px] font-semibold text-ink-0">
          {row.customerName}
        </p>
        <p className="truncate text-[12px] text-ink-5">{row.customerEmail}</p>
      </div>

      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:gap-2">
        <p className="text-[15px] font-semibold tabular-nums text-ink-0">
          {formatCurrency(row.totalAmount, row.currency)}
        </p>
        <Link
          href={`/admin/orders/${row.id}`}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-3.5 text-[12px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-1)]"
        >
          {ctaLabel}
          <ArrowRight className="h-3 w-3" strokeWidth={1.75} />
        </Link>
      </div>
    </li>
  );
}

function CartRow({ row }: { row: AbandonedCartRow }) {
  const ageLabel =
    row.ageHours < 24
      ? `${row.ageHours}h`
      : `${Math.floor(row.ageHours / 24)}d`;
  return (
    <li className="flex flex-col gap-3 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-4 sm:flex-row sm:items-center sm:gap-4">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
        <ShoppingCart className="h-4 w-4 text-ink-3" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold text-ink-0">
          {row.email ? maskEmail(row.email) : "Carrito anónimo"}
        </p>
        <p className="text-[12px] text-ink-5">
          {row.itemsCount} {row.itemsCount === 1 ? "producto" : "productos"} · sin
          actividad hace {ageLabel}
        </p>
      </div>
      <p className="text-[14px] font-semibold tabular-nums text-ink-0 sm:ml-auto">
        {formatCurrency(row.estimatedValue, row.currency)}
      </p>
    </li>
  );
}

function CustomerRow({
  row,
  showLifecycle = false,
}: {
  row: InactiveCustomerRow | ReorderCandidateRow;
  showLifecycle?: boolean;
}) {
  const isInactive = "lifecycle" in row;
  return (
    <li className="flex flex-col gap-3 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-4 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-[13.5px] font-semibold text-ink-0">
            {row.name}
          </p>
          {showLifecycle && isInactive && (
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ring-1 ring-inset",
                row.lifecycle === "inactive"
                  ? "bg-[var(--surface-2)] text-ink-4 ring-[color:var(--hairline)]"
                  : "bg-[color:color-mix(in_srgb,var(--signal-warning)_14%,transparent)] text-[color:var(--signal-warning)] ring-[color:color-mix(in_srgb,var(--signal-warning)_28%,transparent)]",
              )}
            >
              {row.lifecycle === "inactive" ? "Inactivo" : "En riesgo"}
            </span>
          )}
        </div>
        <p className="truncate text-[12px] text-ink-5">{row.email}</p>
        <p className="mt-1 text-[11.5px] text-ink-5">
          {row.ordersCount} pedidos · última compra el {formatDate(row.lastPurchaseAt)} ·
          hace {row.daysSinceLastPurchase}d
        </p>
      </div>
      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:gap-2">
        <p className="text-[14px] font-semibold tabular-nums text-ink-0">
          {formatCurrency(row.totalSpent, "ARS")}
        </p>
        <Link
          href={`/admin/customers?email=${encodeURIComponent(row.email)}`}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-3.5 text-[12px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-1)]"
        >
          Contactar
          <ArrowRight className="h-3 w-3" strokeWidth={1.75} />
        </Link>
      </div>
    </li>
  );
}

function LeverCard({
  icon: Icon,
  title,
  description,
  state,
  detail,
  cta,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  state: RecoveryAppState | "info";
  detail?: string;
  cta: { label: string; href: string };
}) {
  const stateInfo =
    state === "info"
      ? null
      : appStateMeta[state];
  return (
    <div className="flex h-full flex-col gap-4 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
            <Icon className="h-4 w-4 text-ink-3" strokeWidth={1.75} />
          </span>
          <p className="text-[14px] font-semibold text-ink-0">{title}</p>
        </div>
        {stateInfo && (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] ring-1 ring-inset",
              stateInfo.pillClass,
            )}
          >
            {stateInfo.label}
          </span>
        )}
      </div>
      <p className="text-[12.5px] leading-[1.55] text-ink-5">{description}</p>
      {detail && (
        <p className="rounded-[var(--r-xs)] border border-dashed border-[color:var(--hairline)] bg-[var(--surface-1)] px-3 py-2 text-[11.5px] leading-[1.4] text-ink-4">
          {detail}
        </p>
      )}
      <Link
        href={cta.href}
        className="mt-auto inline-flex h-10 items-center justify-center gap-1.5 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-4 text-[12.5px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-1)]"
      >
        {cta.label}
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
      </Link>
    </div>
  );
}

export function RecoveryPage({ snapshot }: RecoveryPageProps) {
  const { summary, levers } = snapshot;
  const totalRecoverable = formatCurrency(
    summary.recoverableValue,
    summary.currency,
  );

  const hasAnyRecoverableMoney =
    summary.pendingPaymentsCount > 0 ||
    summary.failedPaymentsCount > 0 ||
    summary.abandonedCartsCount > 0;
  const hasAnyCustomerOpportunity =
    summary.inactiveCustomersCount > 0 || summary.reorderCandidatesCount > 0;

  return (
    <div className="animate-in fade-in space-y-12 pb-32 duration-700">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-ink-5">
          <Recycle className="h-3.5 w-3.5" strokeWidth={1.75} />
          Ventas · Recuperación
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-[28px] font-semibold leading-[1.05] tracking-[-0.03em] text-ink-0 sm:text-[32px]">
              Dinero y clientes para recuperar
            </h1>
            <p className="max-w-2xl text-[13.5px] leading-[1.55] text-ink-5">
              No es analítica: es una lista accionable de pagos pendientes,
              carritos abandonados y clientes que se pueden volver a activar.
              Cada fila te lleva al lugar exacto donde se opera la
              recuperación.
            </p>
          </div>
          <div className="flex flex-col gap-1 self-start text-right lg:self-auto">
            <p className="text-[10.5px] font-medium uppercase tracking-[0.18em] text-ink-5">
              Valor recuperable
            </p>
            <p className="text-[26px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-ink-0">
              {totalRecoverable}
            </p>
            <p className="text-[11.5px] text-ink-5">
              Suma de pagos pendientes, fallidos y carritos parados.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryTile
            label="Pagos pendientes"
            value={String(summary.pendingPaymentsCount)}
            caption={
              summary.pendingPaymentsValue > 0
                ? `${formatCurrency(summary.pendingPaymentsValue, summary.currency)} en riesgo`
                : "Sin pagos sin confirmar"
            }
            icon={Clock}
            tone={summary.pendingPaymentsCount > 0 ? "warning" : "muted"}
          />
          <SummaryTile
            label="Pagos caídos"
            value={String(summary.failedPaymentsCount)}
            caption={
              summary.failedPaymentsValue > 0
                ? `${formatCurrency(summary.failedPaymentsValue, summary.currency)} a reintentar`
                : "Sin pagos rechazados"
            }
            icon={XCircle}
            tone={summary.failedPaymentsCount > 0 ? "danger" : "muted"}
          />
          <SummaryTile
            label="Carritos parados"
            value={String(summary.abandonedCartsCount)}
            caption={
              summary.abandonedCartsValue > 0
                ? `${formatCurrency(summary.abandonedCartsValue, summary.currency)} en juego`
                : "Sin carritos abandonados"
            }
            icon={ShoppingCart}
            tone={summary.abandonedCartsCount > 0 ? "warning" : "muted"}
          />
          <SummaryTile
            label="Clientes para recompra"
            value={String(summary.reorderCandidatesCount)}
            caption={
              summary.reorderCandidatesCount > 0
                ? `${summary.inactiveCustomersCount} inactivos · listos para mensaje`
                : "Sin candidatos en este momento"
            }
            icon={Users}
            tone={summary.reorderCandidatesCount > 0 ? "neutral" : "muted"}
          />
        </div>
      </header>

      {/* ── Pagos pendientes ───────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Pagos pendientes"
          title="Cobros iniciados sin confirmar"
          description="Pedidos que abrieron checkout pero el medio de pago todavía no confirmó la operación. Reintentá el cobro o contactá al comprador."
          count={summary.pendingPaymentsCount}
        />
        {snapshot.pendingPayments.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {snapshot.pendingPayments.map((row) => (
              <OrderRow key={row.id} row={row} ctaLabel="Reintentar cobro" />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={CheckCircle2}
            title="Ningún cobro en espera"
            copy="No hay pedidos con pago iniciado sin confirmar. Cuando aparezcan, los vas a ver acá."
          />
        )}
      </section>

      {/* ── Pagos fallidos ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Pagos caídos"
          title="Pedidos con cobro rechazado"
          description="El proveedor rechazó el pago. Suelen recuperarse con un mensaje rápido al comprador para que reintente o cambie de medio."
          count={summary.failedPaymentsCount}
        />
        {snapshot.failedPayments.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {snapshot.failedPayments.map((row) => (
              <OrderRow key={row.id} row={row} ctaLabel="Recuperar pedido" />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={CheckCircle2}
            title="Ningún pago rechazado"
            copy="No hay pedidos recientes con pago caído. Si aparecen, los vas a poder reintentar desde acá."
          />
        )}
      </section>

      {/* ── Carritos abandonados ───────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Carritos parados"
          title="Compradores que llegaron pero no terminaron"
          description="Carritos con productos cargados que no tuvieron actividad reciente. Si el carrito tiene email asociado podés mandarles un recordatorio."
          count={summary.abandonedCartsCount}
        />
        {snapshot.abandonedCarts.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {snapshot.abandonedCarts.map((row) => (
              <CartRow key={row.id} row={row} />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={ShoppingCart}
            title="Sin carritos abandonados"
            copy="No detectamos carritos parados con productos. Te avisamos acá apenas aparezcan."
          />
        )}
      </section>

      {/* ── Recompra ───────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Recompra"
          title="Clientes recurrentes listos para volver a comprar"
          description="Clientes con dos o más compras cuya última pedido superó el umbral configurado para el follow-up de reorder. Regla explícita: si el cron de post-compra los tomaría hoy, están acá."
          count={summary.reorderCandidatesCount}
        />
        {snapshot.reorderCandidates.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {snapshot.reorderCandidates.map((row) => (
              <CustomerRow key={row.email} row={row} />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={Users}
            title="Sin candidatos a recompra"
            copy="Todavía no hay clientes recurrentes que hayan superado el umbral de reorder. El módulo se va a poblar a medida que la base madure."
          />
        )}
      </section>

      {/* ── Inactivos ──────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Reactivación"
          title="Clientes que se enfriaron"
          description="Clientes con compras anteriores que no volvieron en los últimos 60–90 días. Es la base lógica para una campaña de reactivación o un mensaje 1:1."
          count={summary.inactiveCustomersCount}
        />
        {snapshot.inactiveCustomers.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {snapshot.inactiveCustomers.map((row) => (
              <CustomerRow key={row.email} row={row} showLifecycle />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={Users}
            title="Sin clientes inactivos"
            copy="Toda tu base compró recientemente. Cuando alguien pase de los 60 días sin volver, va a aparecer acá."
          />
        )}
      </section>

      {/* ── Palancas ───────────────────────────────────────────────── */}
      <section className="space-y-4">
        <SectionHeader
          eyebrow="Palancas"
          title="Lo que tenés activo para recuperar automáticamente"
          description="Estado real de las apps y emails que disparan recuperación sin que tengas que hacerlo a mano. Activá lo que falte para escalar el trabajo."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <LeverCard
            icon={MessageCircle}
            title="WhatsApp recovery"
            description="Mensajes template a carritos abandonados y pagos pendientes vía WhatsApp Cloud API. Requiere phone number ID, access token y template aprobado por Meta."
            state={levers.whatsapp.state}
            detail={
              levers.whatsapp.configured
                ? "Conexión completa con phone, token y template configurados."
                : "Falta completar al menos uno: phone number ID, access token o template aprobado."
            }
            cta={{
              label:
                levers.whatsapp.state === "active"
                  ? "Abrir configuración"
                  : "Configurar WhatsApp",
              href: "/admin/apps/whatsapp-recovery",
            }}
          />
          <LeverCard
            icon={Recycle}
            title="Reorder follow-up"
            description="Email automático a clientes recurrentes cuando superan el umbral configurado de días desde su última compra. Se ejecuta como parte del cron de post-compra."
            state={levers.postPurchase.state}
            detail={
              levers.postPurchase.reorderFollowupEnabled
                ? "Flujo activo. El cron va a tomar a los candidatos en la próxima corrida."
                : "Flujo apagado: no se está enviando ningún follow-up de recompra."
            }
            cta={{
              label: "Configurar flujos",
              href: "/admin/apps/post-purchase-flows/setup",
            }}
          />
          <LeverCard
            icon={Mail}
            title="Email de carrito abandonado"
            description="Notificación automática a quien dejó el carrito tirado. Se gestiona desde Mi tienda > Comunicación > Emails automáticos."
            state="info"
            detail={
              levers.emails.abandonedCartEnabled
                ? "Activo: el email se envía automáticamente cuando un carrito queda parado."
                : "Apagado: hoy no se envía ningún email de recordatorio de carrito."
            }
            cta={{
              label: "Ajustar emails",
              href: "/admin/store?tab=comunicacion",
            }}
          />
          <LeverCard
            icon={CreditCard}
            title="Recordatorios de pago"
            description="Aviso al comprador cuando un cobro queda pendiente o se rechaza. Se configuran junto al resto de los emails transaccionales."
            state="info"
            detail={
              levers.emails.paymentPendingEnabled || levers.emails.paymentFailedEnabled
                ? "Al menos uno de los avisos (pendiente / fallido) está activo."
                : "Todos los avisos de pago están apagados."
            }
            cta={{
              label: "Ajustar emails",
              href: "/admin/store?tab=comunicacion",
            }}
          />
          <LeverCard
            icon={Users}
            title="Base de clientes"
            description="El cuadro completo con segmentos, ticket medio y ciclo de vida vive en Clientes. Filtrá por inactivos o ticket alto para armar campañas manuales."
            state="info"
            cta={{
              label: "Ir a Clientes",
              href: "/admin/customers",
            }}
          />
          <LeverCard
            icon={Wallet}
            title="Detalle financiero"
            description="Si necesitás ver cobrado, pendiente, comisiones y rentabilidad por pedido al detalle, esa vista vive en el módulo financiero (sigue accesible aunque no esté en el menú)."
            state="info"
            cta={{
              label: "Abrir Finanzas",
              href: "/admin/finances",
            }}
          />
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="flex items-start gap-3 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-4 text-[12px] leading-[1.55] text-ink-5">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-ink-5" strokeWidth={1.75} />
        <p>
          Recuperación se calcula a demanda con tu base real: pedidos,
          carritos, clientes agregados y configuración de apps. No estimamos
          uplift ni inventamos predicciones — si algo no aparece, es porque no
          hay un caso real para mostrar.
          {!hasAnyRecoverableMoney && !hasAnyCustomerOpportunity && (
            <span className="mt-2 block font-medium text-ink-3">
              Hoy no detectamos casos para recuperar. Cuando aparezcan pagos
              caídos, carritos parados o clientes inactivos, vas a verlos acá.
            </span>
          )}
        </p>
      </footer>
    </div>
  );
}
