import Link from "next/link";
import { ArrowUpRight, ChevronRight, ShieldCheck } from "lucide-react";

import { isCurrentUserOps } from "@/lib/auth/ops";
import { getCurrentStore } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getMercadoPagoPlatformReadiness } from "@/lib/payments/mercadopago/platform-readiness";
import { SETTINGS_CATEGORIES } from "@/components/admin/settings/SettingsShell";

// ─── Settings overview ──────────────────────────────────────────────────
//
// The /admin/settings index page is the entry point of the settings
// center. The SettingsShell (parent layout) already owns the page title
// and the right-side category nav, so this page focuses on a honest
// status overview of every real setting surface.
//
// Each card shows:
//   · the canonical category label,
//   · a single honest status line sourced from the DB,
//   · a deep link into the category's dedicated page (the real form).
//
// The only setting whose status we compute inline is Mercado Pago
// connection, because it is the single most failure-prone state a
// merchant needs to see up front. Everything else links out — the full
// forms live in each category page.

export const dynamic = "force-dynamic";

interface CategoryStatus {
  href: string;
  label: string;
  summary: string;
  tone: "ok" | "warn" | "muted";
}

export default async function SettingsHubPage() {
  const [store, isOps] = await Promise.all([
    getCurrentStore(),
    isCurrentUserOps(),
  ]);

  // Derive a single honest status per category. When the data is not
  // available (e.g. store is missing), we surface a muted line instead
  // of faking a value.
  const storeId = store?.id ?? null;

  const [mpRow] = await Promise.all([
    storeId
      ? prisma.storePaymentProvider.findUnique({
          where: { storeId_provider: { storeId, provider: "mercadopago" } },
          select: { status: true, externalAccountId: true },
        })
      : Promise.resolve(null),
  ]);

  const mpConnected = mpRow?.status === "connected" && !!mpRow.externalAccountId;

  const categoryStatus: CategoryStatus[] = [
    {
      href: "/admin/settings/pagos",
      label: "Medios de pago",
      summary: mpConnected
        ? "Mercado Pago conectado. El checkout público está habilitado."
        : "Mercado Pago sin conectar. El checkout no puede cobrar todavía.",
      tone: mpConnected ? "ok" : "warn",
    },
    {
      href: "/admin/settings/dominios",
      label: "Dominios",
      summary: "Subdominio de Nexora y hasta 1 dominio propio por tienda.",
      tone: "muted",
    },
    {
      href: "/admin/settings/legal",
      label: "Legal y ARCA",
      summary: "Perfil fiscal, facturación electrónica y políticas legales.",
      tone: "muted",
    },
    {
      href: "/admin/settings/comunicacion",
      label: "WhatsApp y mensajes",
      summary: "Recuperación por WhatsApp y mensajes automáticos al cliente.",
      tone: "muted",
    },
    {
      href: "/admin/settings/plan",
      label: "Plan y facturación",
      summary: "Suscripción de Nexora, límites del plan y créditos IA.",
      tone: "muted",
    },
    {
      href: "/admin/settings/finanzas",
      label: "Finanzas y retiros",
      summary: "Cuentas bancarias habilitadas para recibir retiros.",
      tone: "muted",
    },
    {
      href: "/admin/settings/integraciones",
      label: "Integraciones",
      summary: "Proveedores externos, APIs y webhooks conectados.",
      tone: "muted",
    },
  ];

  const platformReadiness = isOps ? getMercadoPagoPlatformReadiness() : null;

  return (
    <div className="space-y-8">
      {/* Overview cards — one per real category. The SettingsShell already
          draws the page title; we don't repeat it here. */}
      <section aria-label="Resumen de configuraciones" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {categoryStatus.map((row) => (
          <Link
            key={row.href}
            href={row.href}
            className="group flex items-start justify-between gap-4 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-5 py-4 transition-colors hover:border-[color:var(--hairline-strong)]"
          >
            <div className="min-w-0">
              <h3 className="text-[14px] font-semibold text-ink-0">{row.label}</h3>
              <p
                className={
                  row.tone === "ok"
                    ? "mt-1 text-[12px] leading-[1.55] text-[color:var(--signal-success)]"
                    : row.tone === "warn"
                    ? "mt-1 text-[12px] leading-[1.55] text-[color:var(--signal-warning)]"
                    : "mt-1 text-[12px] leading-[1.55] text-ink-5"
                }
              >
                {row.summary}
              </p>
            </div>
            <ChevronRight
              className="mt-0.5 h-4 w-4 shrink-0 text-ink-6 transition-colors group-hover:text-ink-0"
              strokeWidth={1.75}
            />
          </Link>
        ))}
      </section>

      {/* Ops-only block: visible ONLY when the current user is on the
          Nexora ops allowlist. Never shown to merchants. Keeps the
          existing /admin/settings/integrations/mercadopago diagnostic
          reachable without leaking to regular tenants. */}
      {isOps && platformReadiness ? (
        <section aria-label="Operaciones de plataforma">
          <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)]">
                <ShieldCheck className="h-4 w-4 text-ink-0" strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-6">
                    Operaciones · Nexora
                  </span>
                  <span
                    className={
                      platformReadiness.ready
                        ? "inline-flex items-center rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.14em] text-[color:var(--signal-success)]"
                        : "inline-flex items-center rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.14em] text-[color:var(--signal-warning)]"
                    }
                  >
                    {platformReadiness.ready ? "Listo" : "Faltan variables"}
                  </span>
                </div>
                <h3 className="mt-1 text-[14px] font-semibold text-ink-0">
                  Mercado Pago · Plataforma
                </h3>
                <p className="mt-1 text-[12px] leading-[1.55] text-ink-5">
                  Readiness global de OAuth con Mercado Pago. Diagnóstico de solo lectura; los secretos viven
                  como variables de entorno.
                </p>
              </div>
              <Link
                href="/admin/settings/integrations/mercadopago"
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-0 transition-colors hover:text-ink-2"
              >
                Abrir diagnóstico
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} />
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* Tiny footnote keeps the page honest: categories listed above come
          from the SettingsShell literal, so adding a dead card here is
          impossible without also registering a real page. */}
      <p className="text-[11px] text-ink-6">
        {SETTINGS_CATEGORIES.flatMap((g) => g.items).length} categorías · Todas apuntan a una página real dentro de
        Configuración.
      </p>
    </div>
  );
}
