// ─── Abandoned cart recovery · Manage surface ───
// Dedicated surface for the app so "Abrir app" lands on a page that
// actually talks about recovery — not the generic /admin/settings.
// Shows tenant-scoped health of the recovery loop (cron + email log +
// threshold) and deep-links to the related admin surfaces. No new
// writes, no new DB tables.

import Link from "next/link";
import { ArrowLeft, ArrowRight, Mail, Clock, Activity } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { getActiveStoreInfo } from "@/lib/store-engine/admin/queries";
import { getAppDetail } from "@/lib/apps/queries";
import { AppStatusBadge } from "@/components/admin/apps/AppStatusBadge";
import { AppMetricsCard } from "@/components/admin/apps/_shared/AppMetricsCard";
import { getAppEmailMetrics } from "@/lib/apps/_shared/metrics";

export const dynamic = "force-dynamic";

const APP_SLUG = "abandoned-cart-recovery";

export default async function AbandonedCartRecoveryManagePage() {
  const store = await getActiveStoreInfo();
  const item = await getAppDetail(store.id, APP_SLUG);
  if (!item) {
    return (
      <div className="p-10 text-[13px] text-ink-5">App no encontrada.</div>
    );
  }

  const [metrics, abandonedCount, activeCartsWithEmail] = await Promise.all([
    getAppEmailMetrics(store.id, "ABANDONED_CART"),
    prisma.cart.count({ where: { storeId: store.id, status: "abandoned" } }),
    prisma.cart.count({
      where: {
        storeId: store.id,
        status: "active",
        items: { some: {} },
        checkouts: {
          some: { email: { not: null }, status: { not: "completed" } },
        },
      },
    }),
  ]);

  const thresholdMinutes =
    Number.parseInt(process.env.ABANDONED_CART_THRESHOLD_MINUTES ?? "", 10) ||
    120;

  return (
    <div className="animate-in fade-in duration-[var(--dur-slow)] space-y-8">
      <Link
        href={`/admin/apps/${APP_SLUG}`}
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-5 hover:text-ink-0 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
        Volver a la app
      </Link>

      {/* Header */}
      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6 lg:p-8">
        <div className="flex items-start gap-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
            <Mail className="h-5 w-5 text-ink-0" strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
                Retención
              </span>
              <span className="text-ink-6">·</span>
              <AppStatusBadge
                availability={item.availability}
                installState={item.state}
              />
            </div>
            <h1 className="mt-2 text-[24px] lg:text-[28px] font-semibold leading-[1.12] tracking-[-0.025em] text-ink-0">
              Recuperación de carritos
            </h1>
            <p className="mt-2 max-w-2xl text-[14px] leading-[1.55] text-ink-5">
              Nexora envía un email único a cada carrito inactivo con email
              capturado y marca el carrito como abandonado para no duplicar
              contactos. La recuperación corre desde el cron
              {" "}<code className="text-[12px] font-mono text-ink-3">/api/cron/abandoned-carts</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Operational state */}
      <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
        <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
          Estado operativo
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-px overflow-hidden rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[color:var(--hairline)] md:grid-cols-3">
          <Stat
            icon={Clock}
            label="Umbral de abandono"
            value={`${thresholdMinutes} min`}
            hint="Minutos de inactividad antes de considerar un carrito como abandonado. Configurable vía ABANDONED_CART_THRESHOLD_MINUTES."
          />
          <Stat
            icon={Activity}
            label="Candidatos en cola"
            value={activeCartsWithEmail.toLocaleString("es-AR")}
            hint="Carritos activos con email capturado que podrían ser alcanzados por el próximo run del cron."
          />
          <Stat
            icon={Mail}
            label="Carritos abandonados"
            value={abandonedCount.toLocaleString("es-AR")}
            hint="Total histórico de carritos marcados como abandonados por esta app."
          />
        </div>
      </section>

      {/* Email metrics (honest) */}
      <AppMetricsCard
        title="Envíos de recuperación por email"
        sentCaveat="Un envío es un email de recuperación entregado al destinatario con email capturado en el checkout."
        metrics={metrics}
      />

      {/* Related surfaces */}
      <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
        <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
          Superficies relacionadas
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
          <RelatedLink
            href="/admin/apps/whatsapp-recovery/setup"
            title="WhatsApp Recovery"
            description="Segundo canal de recuperación en paralelo (plan Growth)."
          />
          <RelatedLink
            href="/admin/apps/post-purchase-flows/setup"
            title="Flujos de post-compra"
            description="Mensajes de reseña y recompra después de entregar."
          />
          <RelatedLink
            href="/admin/orders"
            title="Órdenes"
            description="Ver las conversiones que siguieron a una recuperación."
          />
        </div>
      </section>

      {/* Honesty footer */}
      <div className="rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-4 py-3 text-[11px] leading-[1.55] text-ink-6">
        El envío requiere RESEND_API_KEY configurada. Sin esa env la app
        registra los envíos en EmailLog pero no los entrega (fallback al
        MockProvider). Verificar en <code className="font-mono">docs/PRODUCTION.md</code>.
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="bg-[var(--surface-0)] p-5">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-ink-5" strokeWidth={1.75} />
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
          {label}
        </span>
      </div>
      <p className="mt-3 text-[22px] font-semibold tracking-[-0.02em] text-ink-0 tabular-nums">
        {value}
      </p>
      <p className="mt-2 text-[11px] leading-[1.5] text-ink-6">{hint}</p>
    </div>
  );
}

function RelatedLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start justify-between gap-3 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-4 transition-colors hover:bg-[var(--surface-2)]"
    >
      <div>
        <p className="text-[13px] font-semibold text-ink-0">{title}</p>
        <p className="mt-1 text-[12px] leading-[1.5] text-ink-5">
          {description}
        </p>
      </div>
      <ArrowRight
        className="mt-1 h-3.5 w-3.5 shrink-0 text-ink-5 transition-transform group-hover:translate-x-0.5"
        strokeWidth={1.75}
      />
    </Link>
  );
}
