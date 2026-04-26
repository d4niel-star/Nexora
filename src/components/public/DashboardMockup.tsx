"use client";

import {
  ArrowUpRight,
  BarChart3,
  Boxes,
  Megaphone,
  Package,
  Sparkles,
  TrendingUp,
} from "lucide-react";

/**
 * DashboardMockup
 *
 * A pure-CSS visual representation of the Nexora admin, composed entirely
 * with HTML + Tailwind so the marketing landing has a premium product
 * shot without relying on external screenshots that would go stale on
 * every UI iteration.
 *
 * Disclosure rule: every figure shown here is labelled "demo" or "ejemplo"
 * because Nexora has no public revenue data to anchor real numbers to.
 * Numbers exist only to sketch the layout the merchant will see; never to
 * make a results claim.
 */
export function DashboardMockup({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[var(--r-xl)] bg-[var(--shell-dark)] shadow-[var(--shadow-elevated)] ${className}`}
      role="img"
      aria-label="Vista previa del panel administrador de Nexora (composición ilustrativa)"
    >
      {/* Topbar */}
      <div className="flex items-center justify-between bg-[var(--chrome-bg)] px-4 py-2.5 text-[10px] text-[var(--chrome-fg-muted)]">
        <div className="flex items-center gap-2.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-[6px] bg-[var(--brand-soft-strong)]">
            <Sparkles className="h-3 w-3 text-white" strokeWidth={2} />
          </span>
          <span className="font-semibold tracking-[-0.02em] text-white">nexora</span>
          <span className="hidden h-3 w-px bg-white/15 sm:block" />
          <span className="hidden font-semibold uppercase tracking-[0.18em] sm:inline">
            Demo · Aura Essentials
          </span>
        </div>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--brand-soft-strong)] text-[10px] font-semibold text-white">
          AE
        </span>
      </div>

      {/* Body: sidebar + canvas */}
      <div className="grid grid-cols-[120px_1fr] gap-0">
        {/* Mock sidebar */}
        <div className="flex flex-col gap-0.5 bg-[var(--sidebar-bg)] py-3 pl-2 pr-1.5 text-[10px]">
          {[
            { label: "Panel", active: true },
            { label: "Estadísticas" },
            { label: "Catálogo" },
            { label: "Ventas" },
            { label: "Tienda" },
            { label: "Marketing" },
            { label: "Marketplace" },
          ].map((item) => (
            <div
              key={item.label}
              className={`relative flex items-center gap-1.5 rounded-full px-2 py-1.5 transition-colors ${
                item.active
                  ? "bg-white/10 font-medium text-white"
                  : "text-[var(--sidebar-fg)]"
              }`}
            >
              {item.active && (
                <span
                  aria-hidden
                  className="absolute -left-2 top-1/2 h-2.5 w-[3px] -translate-y-1/2 rounded-r-full bg-white"
                />
              )}
              <span
                className={`h-1 w-1 rounded-full ${
                  item.active ? "bg-white" : "bg-white/40"
                }`}
              />
              {item.label}
            </div>
          ))}
        </div>

        {/* Canvas with floating paper */}
        <div className="bg-[var(--shell-dark)] p-2">
          <div className="rounded-[10px] bg-[var(--admin-canvas)] p-3 shadow-[var(--shadow-soft)]">
            {/* Header */}
            <div className="mb-3 flex items-end justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-5">
                  Panel · ejemplo
                </div>
                <div className="mt-0.5 text-[14px] font-semibold tracking-[-0.02em] text-ink-0">
                  Resumen de tienda
                </div>
              </div>
              <span className="rounded-full bg-[var(--brand-soft)] px-2 py-0.5 text-[9px] font-medium text-[var(--brand)]">
                7 días · demo
              </span>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { icon: TrendingUp, label: "Ingreso", value: "$ 184.5K" },
                { icon: Package, label: "Pedidos", value: "1.247" },
                { icon: Boxes, label: "Conversión", value: "3.2%" },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-[8px] border border-[color:var(--card-border)] bg-white p-2"
                >
                  <div className="flex items-center gap-1 text-[8px] font-medium uppercase tracking-[0.14em] text-ink-5">
                    <kpi.icon className="h-2.5 w-2.5" strokeWidth={2} />
                    {kpi.label}
                  </div>
                  <div className="mt-0.5 text-[12px] font-semibold tabular-nums tracking-[-0.02em] text-ink-0">
                    {kpi.value}
                  </div>
                  <div className="mt-1 flex items-center gap-0.5 text-[8px] font-medium text-[var(--signal-success)]">
                    <ArrowUpRight className="h-2 w-2" strokeWidth={2.5} />
                    +12% vs anterior
                  </div>
                </div>
              ))}
            </div>

            {/* Chart row */}
            <div className="mt-1.5 rounded-[8px] border border-[color:var(--card-border)] bg-white p-2">
              <div className="flex items-center justify-between text-[9px] font-medium text-ink-5">
                <span className="flex items-center gap-1">
                  <BarChart3 className="h-2.5 w-2.5" strokeWidth={2} />
                  Ingreso por día (ejemplo)
                </span>
                <span className="text-ink-6">$ 184.5K</span>
              </div>
              {/* Bar chart rendered as flex bars */}
              <div className="mt-2 flex h-12 items-end gap-1">
                {[55, 62, 48, 70, 58, 80, 72].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm bg-gradient-to-t from-[var(--brand)] to-[var(--accent-500)]"
                    style={{ height: `${h}%`, opacity: 0.55 + i * 0.05 }}
                  />
                ))}
              </div>
            </div>

            {/* Bottom row */}
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              <div className="rounded-[8px] border border-[color:var(--card-border)] bg-white p-2">
                <div className="flex items-center gap-1 text-[9px] font-medium text-ink-5">
                  <Megaphone className="h-2.5 w-2.5" strokeWidth={2} />
                  Ads
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[11px] font-semibold tabular-nums text-ink-0">
                    ROAS 3.4x
                  </span>
                  <span className="rounded-full bg-[color-mix(in_srgb,var(--signal-success)_18%,transparent)] px-1.5 py-px text-[8px] font-medium text-[var(--signal-success)]">
                    Activo
                  </span>
                </div>
              </div>
              <div className="rounded-[8px] border border-[color:var(--card-border)] bg-white p-2">
                <div className="flex items-center gap-1 text-[9px] font-medium text-ink-5">
                  <Boxes className="h-2.5 w-2.5" strokeWidth={2} />
                  Inventario
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[11px] font-semibold tabular-nums text-ink-0">
                    248 SKU
                  </span>
                  <span className="rounded-full bg-[var(--brand-soft)] px-1.5 py-px text-[8px] font-medium text-[var(--brand)]">
                    OK
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Demo watermark */}
      <span className="pointer-events-none absolute right-3 top-3 select-none rounded-full bg-white/10 px-2 py-0.5 text-[8px] font-medium uppercase tracking-[0.18em] text-white/70">
        Vista previa
      </span>
    </div>
  );
}
