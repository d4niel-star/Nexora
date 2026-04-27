import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Boxes,
  CircleDollarSign,
  Layers,
  Megaphone,
  Network,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Truck,
} from "lucide-react";
import { NexoraDiagram } from "@/components/public/NexoraDiagram";
import { PageReveal, Reveal, StaggerGroup, StaggerItem } from "@/components/public/PublicMotion";

// ─── Nexora 2027 Home ─────────────────────────────────────────────────────
// This is a structural rebuild of the marketing landing. The previous home
// was a polished SaaS template — asymmetric hero with a fake admin
// screenshot on the right, four stacked feature grids, generic copy
// ("Tu marca adelante / Tu operación en orden"). It looked like every
// other ecommerce platform launching in 2025.
//
// The 2027 rewrite trades that template for an editorial composition:
//
//   1. Type-first hero. No screenshot beside the headline. The headline
//      *is* the visual anchor, set in the new .text-jumbo display style
//      against a hairline canvas grid.
//
//   2. Architectural diagram (NexoraDiagram) sits in its own honest
//      section, framed as "what Nexora actually is" — a single core that
//      connects catalog/stock/proveedores with storefront/checkout/ads.
//      Replaces the dashboard mockup that read as fake.
//
//   3. Bento capabilities: a 12-col asymmetric grid (one hero card +
//      smaller paired cards) instead of the flat 3-col strip. Reads as
//      designed, not as a feature dump.
//
//   4. Numbered workflow rail: horizontal steps separated by hairlines,
//      each anchored by a numeric index — same rhythm as the new
//      .section-rule and .eyebrow-label primitives elsewhere.
//
//   5. Closing: a single high-density manifesto block on a navy panel,
//      mirroring the auth split-shell so the landing and the auth
//      experience read as one continuous brand surface.
//
// Every "ejemplo" / "demo" label is intentionally explicit — Nexora has no
// production traction yet and the home should not imply otherwise.

const CAPABILITIES = [
  {
    icon: Layers,
    title: "Catálogo unificado",
    description:
      "Productos, variantes, costos y stock viven en una sola base. Sin importadores rotos, sin duplicados.",
    span: "lg:col-span-7",
  },
  {
    icon: ShoppingCart,
    title: "Checkout validado",
    description:
      "Mercado Pago integrado, total calculado en servidor, stock confirmado antes del pago.",
    span: "lg:col-span-5",
  },
  {
    icon: Megaphone,
    title: "Ads conectados al catálogo real",
    description:
      "Meta, TikTok y Google leen tu catálogo, no un píxel suelto. Decisiones con datos del negocio.",
    span: "lg:col-span-5",
  },
  {
    icon: Truck,
    title: "Logística operativa",
    description:
      "Cotización, etiquetas y tracking en el mismo flujo. Correo Argentino, Andreani y carriers propios.",
    span: "lg:col-span-7",
  },
] as const;

const WORKFLOW = [
  {
    index: "01",
    title: "Conectá tu base",
    description:
      "Importás productos, variantes y stock. Mercado Pago listo en minutos, dominio propio cuando estés.",
  },
  {
    index: "02",
    title: "Activá módulos",
    description:
      "Storefront, checkout, ads y comunicación se prenden bajo el mismo contrato operativo.",
  },
  {
    index: "03",
    title: "Operá con criterio",
    description:
      "Decidís sobre datos reales: stock, ingresos, conversión y comportamiento de cliente.",
  },
] as const;

// Reference numbers shown on the home strip. They are NOT customer
// metrics — they are operational shapes (e.g. "<60s p95 checkout") that
// describe how the platform is built. Every label is prefixed with
// "Referencia" / "Objetivo" so nothing reads as a customer claim.
const REFERENCES = [
  { value: "1", label: "Núcleo de datos", meta: "Una sola base · sin duplicación" },
  { value: "<60s", label: "Checkout objetivo", meta: "p95 sostenido · validado en servidor" },
  { value: "100%", label: "Stock confirmado", meta: "Antes del cobro · no después" },
  { value: "0", label: "Píxeles huérfanos", meta: "Ads leen catálogo real" },
] as const;

const PILLARS = [
  { icon: BarChart3, label: "Estadísticas operativas" },
  { icon: TrendingUp, label: "Conversión y embudo" },
  { icon: Boxes, label: "Inventario auditable" },
  { icon: Network, label: "Sourcing con proveedores" },
  { icon: CircleDollarSign, label: "Margen real por SKU" },
  { icon: Sparkles, label: "Tienda IA · copilot" },
] as const;

export default function MarketingLandingPage() {
  return (
    <>
      {/* ─── 01 / Hero ──────────────────────────────────────────────────
          Type-first hero, no screenshot beside it. The canvas grid
          backdrop and the bottom hairline anchor the architectural feel
          we want the brand to read as. */}
      <section className="relative isolate overflow-hidden border-b border-[color:var(--hairline)] bg-[var(--surface-paper)]">
        <div aria-hidden className="canvas-grid absolute inset-0 -z-10 opacity-60" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[480px] bg-[radial-gradient(60%_50%_at_50%_0%,rgba(0,0,32,0.10)_0%,transparent_70%)]"
        />

        <div className="mx-auto flex max-w-7xl flex-col px-5 pb-20 pt-20 sm:px-8 sm:pb-28 sm:pt-28">
          <PageReveal>
            <div className="section-rule">
              <span>01</span>
              <span>Sistema operativo · ecommerce 2027</span>
            </div>

            <h1 className="text-jumbo mt-10 max-w-[18ch]">
              Una sola base
              <br />
              para vender, cobrar
              <br />
              <span className="text-jumbo-quiet">y crecer.</span>
            </h1>

            <p className="mt-10 max-w-2xl text-[17px] leading-[1.6] text-ink-4 sm:text-[18px]">
              Nexora es la capa operativa que une catálogo, storefront,
              checkout, logística, ads e IA sobre un mismo dato real. Construido
              para marcas que quieren decidir, no que quieren parecer.
            </p>

            <div className="mt-12 flex flex-wrap items-center gap-3">
              <Link
                href="/home/register"
                className="group inline-flex h-12 min-w-[200px] items-center justify-center gap-2 rounded-full bg-ink-0 px-7 text-[14px] font-medium text-ink-12 transition-colors hover:bg-ink-2 active:translate-y-px focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
              >
                Crear cuenta
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.75} />
              </Link>
              <Link
                href="/home/pricing"
                className="inline-flex h-12 min-w-[160px] items-center justify-center gap-2 rounded-full border border-[color:var(--hairline-strong)] bg-[var(--surface-paper)] px-7 text-[14px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
              >
                Ver planes
              </Link>
              <span className="ml-1 text-[12px] text-ink-5">
                Sin tarjeta · sin compromiso anual
              </span>
            </div>
          </PageReveal>

          {/* Pillar marquee — reads as "what's inside" without committing
              to a feature grid. Six tiny chips, single line, hairline-only. */}
          <div className="mt-20 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-[color:var(--hairline)] pt-8 sm:gap-x-10">
            {PILLARS.map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-2 text-[12px] text-ink-5">
                <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 02 / What Nexora is — diagram ─────────────────────────────
          The diagram is the *honest* visual anchor: a single core
          connected to catalog/stock/proveedores on the left and
          storefront/checkout/ads on the right. */}
      <section className="bg-[var(--surface-1)]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
          <Reveal>
            <div className="section-rule">
              <span>02</span>
              <span>Qué es Nexora</span>
            </div>
            <div className="mt-10 grid grid-cols-1 items-start gap-12 lg:grid-cols-[5fr_7fr] lg:gap-16">
              <div className="max-w-md">
                <h2 className="text-[34px] font-semibold leading-[1.05] tracking-[-0.035em] text-ink-0 sm:text-[44px]">
                  Una sola capa
                  <br />
                  para todo el negocio.
                </h2>
                <p className="mt-6 text-[15px] leading-[1.65] text-ink-5">
                  El catálogo, el stock y los proveedores alimentan un núcleo
                  operativo único. Storefront, checkout y ads consumen ese
                  mismo núcleo. Sin pegamento entre apps. Sin verdades
                  paralelas.
                </p>
                <ul className="mt-8 space-y-3 text-[14px] leading-[1.55] text-ink-3">
                  <li className="flex items-start gap-2.5">
                    <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-3" />
                    <span>Un solo dato real para todas las decisiones.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-3" />
                    <span>Cero integraciones rotas, cero plugins de terceros bisagra.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-3" />
                    <span>Construido en server-first: total se calcula en backend, stock se confirma antes del pago.</span>
                  </li>
                </ul>
              </div>
              <div className="rounded-[var(--r-xl)] border border-[color:var(--card-border)] bg-[var(--surface-paper)] p-2 shadow-[var(--shadow-elevated)]">
                <NexoraDiagram className="aspect-[6/4.2] w-full rounded-[var(--r-lg)]" />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── 03 / Capabilities — bento ────────────────────────────────── */}
      <section className="bg-[var(--surface-paper)]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
          <Reveal>
            <div className="section-rule">
              <span>03</span>
              <span>Lo que hacés todos los días</span>
            </div>
            <h2 className="mt-10 max-w-[20ch] text-[34px] font-semibold leading-[1.05] tracking-[-0.035em] text-ink-0 sm:text-[44px]">
              Módulos diseñados
              <br />
              para operar.
            </h2>
          </Reveal>

          <StaggerGroup className="bento mt-12">
            {CAPABILITIES.map(({ icon: Icon, title, description, span }) => (
              <StaggerItem key={title} className={`${span} col-span-12`}>
                <article className="group flex h-full flex-col justify-between gap-8 rounded-[var(--r-xl)] border border-[color:var(--card-border)] bg-[var(--surface-1)] p-7 transition-[border-color,background-color] hover:border-[color:var(--card-border-strong)] hover:bg-[var(--surface-2)] sm:p-9">
                  <div className="flex items-start justify-between gap-4">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--hairline)] bg-[var(--surface-paper)] text-ink-0">
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-ink-6 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h3 className="text-[20px] font-semibold leading-[1.2] tracking-[-0.02em] text-ink-0 sm:text-[22px]">
                      {title}
                    </h3>
                    <p className="mt-3 max-w-md text-[14px] leading-[1.6] text-ink-5">
                      {description}
                    </p>
                  </div>
                </article>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* ─── 04 / Reference numbers ─────────────────────────────────────
          Operational shapes, not customer metrics. Every label is
          prefixed with "Referencia" / "Objetivo" so nothing reads as a
          fabricated outcome. */}
      <section className="bg-[var(--surface-1)]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
          <Reveal>
            <div className="section-rule">
              <span>04</span>
              <span>Cómo está construido · referencia</span>
            </div>
          </Reveal>
          <StaggerGroup className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--r-xl)] border border-[color:var(--card-border)] bg-[color:var(--hairline)] sm:grid-cols-4">
            {REFERENCES.map((ref) => (
              <StaggerItem key={ref.label}>
                <div className="flex h-full flex-col gap-2 bg-[var(--surface-paper)] p-7">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-6">
                    Referencia
                  </span>
                  <p className="tabular text-[42px] font-semibold leading-none tracking-[-0.04em] text-ink-0 sm:text-[52px]">
                    {ref.value}
                  </p>
                  <p className="text-[13px] font-semibold tracking-[-0.01em] text-ink-0">
                    {ref.label}
                  </p>
                  <p className="text-[12px] leading-[1.5] text-ink-5">{ref.meta}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* ─── 05 / Workflow — numbered horizontal rail ─────────────────── */}
      <section className="bg-[var(--surface-paper)]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
          <Reveal>
            <div className="section-rule">
              <span>05</span>
              <span>Cómo arrancás</span>
            </div>
            <h2 className="mt-10 max-w-[22ch] text-[34px] font-semibold leading-[1.05] tracking-[-0.035em] text-ink-0 sm:text-[44px]">
              De catálogo a venta
              <br />
              en tres pasos claros.
            </h2>
          </Reveal>

          <StaggerGroup className="mt-12 grid grid-cols-1 gap-0 border-t border-[color:var(--hairline)] md:grid-cols-3 md:divide-x md:divide-[color:var(--hairline)]">
            {WORKFLOW.map((step) => (
              <StaggerItem key={step.index}>
                <div className="flex h-full flex-col gap-6 px-1 py-8 md:px-7 md:py-10">
                  <div className="flex items-center justify-between">
                    <span className="tabular text-[34px] font-semibold leading-none tracking-[-0.04em] text-ink-0">
                      {step.index}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-6">
                      Paso
                    </span>
                  </div>
                  <div className="h-px w-12 bg-ink-3" aria-hidden />
                  <div>
                    <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-ink-0">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-[14px] leading-[1.6] text-ink-5">
                      {step.description}
                    </p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* ─── 06 / Final manifesto + CTA on navy ────────────────────────
          Mirrors the auth split-shell brand panel: same tokens, same
          grid backdrop. The landing closes on the same surface the
          user steps into when they sign up. */}
      <section className="relative isolate overflow-hidden bg-[var(--shell-dark)]">
        <div aria-hidden className="canvas-grid-on-dark absolute inset-0 -z-10 opacity-60" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_80%_100%,rgba(63,79,154,0.40)_0%,transparent_60%)]"
        />
        <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
          <PageReveal>
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--chrome-fg-muted)]">
              <span aria-hidden className="h-px w-4 bg-[color:var(--chrome-fg-muted)]" />
              06
              <span aria-hidden className="h-px w-4 bg-[color:var(--chrome-fg-muted)]" />
              Empezá
            </span>
            <h2 className="mt-8 max-w-[18ch] text-[40px] font-semibold leading-[1.04] tracking-[-0.04em] text-white sm:text-[64px]">
              Menos ruido.
              <br />
              <span className="text-[var(--chrome-fg-muted)]">Más criterio operativo.</span>
            </h2>
            <p className="mt-8 max-w-xl text-[15px] leading-[1.65] text-[var(--chrome-fg-muted)]">
              Una base más clara para vender, cobrar y ordenar tu operación
              desde el primer día. Sin compromiso anual, sin agencia.
            </p>
            <div className="mt-12 flex flex-wrap items-center gap-3">
              <Link
                href="/home/register"
                className="group inline-flex h-12 min-w-[200px] items-center justify-center gap-2 rounded-full bg-white px-7 text-[14px] font-medium text-[var(--brand)] transition-colors hover:bg-[var(--ink-11)] active:translate-y-px focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus-on-dark)]"
              >
                Empezar con Nexora
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.75} />
              </Link>
              <Link
                href="/home/pricing"
                className="inline-flex h-12 min-w-[160px] items-center justify-center gap-2 rounded-full border border-[color:var(--chrome-border)] bg-transparent px-7 text-[14px] font-medium text-white transition-colors hover:bg-[var(--chrome-hover)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus-on-dark)]"
              >
                Ver planes
              </Link>
            </div>
          </PageReveal>
        </div>
      </section>
    </>
  );
}
