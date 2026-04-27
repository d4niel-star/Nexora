import {
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Mail,
  Megaphone,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

/* ─── AIGrowthPreview ───────────────────────────────────────────────────────
 *
 * Marketing-grade mock of the Nexora AI / growth surface. Shape:
 *
 *   ┌─ chrome ─────────────────────────────────────────────────────────┐
 *   │ left column:                                                     │
 *   │   "Tienda IA" header + 3-bubble conversation thread              │
 *   │   suggested actions row (3 chips)                                │
 *   │ right column:                                                    │
 *   │   "Recomendaciones · esta semana" (3 stacked cards w/ delta)     │
 *   │   "Píxeles conectados" status grid (Meta · TikTok · Google)      │
 *   └──────────────────────────────────────────────────────────────────┘
 */

const RECOMMENDATIONS = [
  {
    icon: Megaphone,
    title: "Pausar campaña Meta · Bolsos",
    detail: "ROAS 0,9 · costo por compra +38% vs últimos 7 días",
    action: "Pausar",
    tone: "danger" as const,
  },
  {
    icon: Mail,
    title: "Recuperar 18 carritos de hoy",
    detail: "Email + WhatsApp · ticket prom. $ 14.200",
    action: "Lanzar flujo",
    tone: "info" as const,
  },
  {
    icon: TrendingUp,
    title: "Subir presupuesto · Camisa Lino",
    detail: "ROAS 4,2 · stock 64 unid · margen 41%",
    action: "Aumentar 30%",
    tone: "success" as const,
  },
] as const;

const PIXELS = [
  { label: "Meta", state: "Conectado", icon: Target, ok: true },
  { label: "TikTok", state: "Conectado", icon: Target, ok: true },
  { label: "Google", state: "Pendiente", icon: Target, ok: false },
] as const;

export function AIGrowthPreview({ className }: { className?: string }) {
  return (
    <div className={`product-mock ${className ?? ""}`}>
      {/* ── Window chrome ── */}
      <div className="product-mock-chrome">
        <span aria-hidden className="product-mock-chrome-dot" />
        <span aria-hidden className="product-mock-chrome-dot" />
        <span aria-hidden className="product-mock-chrome-dot" />
        <span aria-hidden className="product-mock-chrome-bar" />
        <span className="text-[10.5px] font-medium tracking-[0.04em] text-ink-5">
          admin.nexora.app · ia
        </span>
      </div>

      {/* ── Body ── */}
      <div className="grid grid-cols-1 gap-0 md:grid-cols-[1.05fr_1fr] md:divide-x md:divide-[color:var(--hairline)]">
        {/* ── Left: Tienda IA chat ─── */}
        <div className="bg-[var(--surface-paper)] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand)] text-white">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
              <div>
                <p className="text-[12px] font-semibold tracking-[-0.01em] text-ink-0">
                  Nexora IA
                </p>
                <p className="text-[10px] text-ink-5">Copilot de tienda · activo</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--signal-success)]/12 px-2 py-0.5 text-[9.5px] font-medium text-[color:var(--signal-success)]">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[color:var(--signal-success)]" />
              en línea
            </span>
          </div>

          {/* Conversation */}
          <div className="mt-4 space-y-2.5">
            <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-[rgba(0,0,32,0.05)] px-3 py-2 text-[11.5px] leading-[1.45] text-ink-1">
              ¿Qué pasó con las ventas esta semana?
            </div>
            <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-[color:var(--hairline)] bg-[var(--surface-1)] px-3 py-2 text-[11.5px] leading-[1.5] text-ink-2">
              Tus ingresos subieron <strong className="font-semibold text-ink-0">12,4%</strong>{" "}
              vs la semana pasada, impulsados por <strong className="font-semibold text-ink-0">Camisa Lino</strong>.
              Detecté <strong className="font-semibold text-ink-0">18 carritos abandonados</strong> hoy con ticket promedio
              alto: ¿lanzamos un flujo de recuperación por WhatsApp?
            </div>
            <div className="ml-auto max-w-[60%] rounded-2xl rounded-br-md bg-[rgba(0,0,32,0.05)] px-3 py-2 text-[11.5px] leading-[1.45] text-ink-1">
              Sí, dale.
            </div>
          </div>

          {/* Suggested action chips */}
          <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-[color:var(--hairline)] pt-3">
            <span className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-ink-6">
              Sugerencias
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--hairline)] bg-[var(--surface-paper)] px-2.5 py-1 text-[10.5px] font-medium text-ink-2">
              <Zap className="h-3 w-3" strokeWidth={1.75} /> Lanzar flujo recuperación
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--hairline)] bg-[var(--surface-paper)] px-2.5 py-1 text-[10.5px] font-medium text-ink-2">
              <Users className="h-3 w-3" strokeWidth={1.75} /> Ver clientes nuevos
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--hairline)] bg-[var(--surface-paper)] px-2.5 py-1 text-[10.5px] font-medium text-ink-2">
              <CircleDollarSign className="h-3 w-3" strokeWidth={1.75} /> Ajustar precio
            </span>
          </div>
        </div>

        {/* ── Right: recommendations + pixels ─── */}
        <div className="bg-[var(--surface-1)] p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-semibold tracking-[-0.01em] text-ink-0">
              Recomendaciones · esta semana
            </span>
            <span className="text-[9.5px] font-medium text-ink-5">3 acciones</span>
          </div>
          <ul className="mt-2 space-y-1.5">
            {RECOMMENDATIONS.map(({ icon: Icon, title, detail, action, tone }) => (
              <li
                key={title}
                className="flex items-center gap-2 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-paper)] px-2.5 py-2"
              >
                <span
                  className={
                    tone === "danger"
                      ? "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--signal-danger)]/10 text-[color:var(--signal-danger)]"
                      : tone === "success"
                      ? "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--signal-success)]/10 text-[color:var(--signal-success)]"
                      : "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]"
                  }
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold tracking-[-0.01em] text-ink-0">
                    {title}
                  </p>
                  <p className="truncate text-[10px] text-ink-5">{detail}</p>
                </div>
                <span className="inline-flex h-6 items-center gap-0.5 rounded-full bg-[var(--brand)] px-2.5 text-[9.5px] font-medium text-white">
                  {action}
                  <ArrowUpRight className="h-2.5 w-2.5" strokeWidth={2} />
                </span>
              </li>
            ))}
          </ul>

          {/* Pixels block */}
          <div className="mt-4 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-paper)] p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-semibold tracking-[-0.01em] text-ink-0">
                Píxeles y tags
              </span>
              <span className="text-[9.5px] font-medium text-ink-5">3 plataformas</span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {PIXELS.map(({ label, state, icon: Icon, ok }) => (
                <div
                  key={label}
                  className="rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 py-2"
                >
                  <div className="flex items-center justify-between">
                    <Icon className="h-3 w-3 text-ink-3" strokeWidth={1.75} />
                    {ok ? (
                      <CheckCircle2
                        className="h-3 w-3 text-[color:var(--signal-success)]"
                        strokeWidth={2}
                      />
                    ) : (
                      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[color:var(--signal-warning)]" />
                    )}
                  </div>
                  <p className="mt-1.5 text-[10.5px] font-semibold text-ink-0">{label}</p>
                  <p
                    className={
                      ok
                        ? "text-[9.5px] text-[color:var(--signal-success)]"
                        : "text-[9.5px] text-[color:var(--signal-warning)]"
                    }
                  >
                    {state}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
