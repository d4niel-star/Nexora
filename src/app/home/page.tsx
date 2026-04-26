import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Megaphone,
  Plug,
  Rocket,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
  Wallet,
} from "lucide-react";
import { DisplayText, Hairline } from "@/components/ui/primitives";
import {
  PageReveal,
  Reveal,
  StaggerGroup,
  StaggerItem,
} from "@/components/public/PublicMotion";
import { DashboardMockup } from "@/components/public/DashboardMockup";

const OPERATING_PILLARS = [
  {
    title: "Catalogo centralizado",
    description: "Productos, variantes, precios y estructura desde una sola base.",
  },
  {
    title: "Storefront propio",
    description: "Una presencia de marca clara, consistente y conectada con tu operacion.",
  },
  {
    title: "Checkout validado",
    description: "Mercado Pago, stock real y pedidos sincronizados en el mismo flujo.",
  },
  {
    title: "IA integrada",
    description: "Recomendaciones y automatizacion sobre datos reales del negocio.",
  },
];

const PRODUCT_MODULES = [
  {
    icon: BarChart3,
    title: "Estadísticas operativas",
    description:
      "Ingresos, conversión y comportamiento de catálogo en una sola vista, con cohortes y atribución por canal.",
    chips: ["Ingreso · ejemplo", "Conversión", "Cohortes"],
  },
  {
    icon: Megaphone,
    title: "Ads conectados",
    description:
      "Meta, TikTok y Google se conectan al catálogo real para optimizar campañas con datos del negocio, no del píxel.",
    chips: ["Meta", "TikTok", "Google"],
  },
  {
    icon: Sparkles,
    title: "Tienda IA",
    description:
      "Un copiloto que arma tu tienda, sugiere precios y ajusta colecciones leyendo lo que ya está cargado.",
    chips: ["Theme studio", "Copilot", "Sugerencias"],
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: Plug,
    title: "Conectá tu base",
    description:
      "Importá productos, variantes y stock. Mercado Pago en minutos, dominio propio cuando estés listo.",
  },
  {
    step: "02",
    icon: Rocket,
    title: "Activá módulos",
    description:
      "Storefront, checkout, ads y comunicación se activan bajo el mismo criterio operativo. Sin integraciones rotas.",
  },
  {
    step: "03",
    icon: BarChart3,
    title: "Operá con criterio",
    description:
      "Decisiones sobre datos reales del negocio: stock, ingresos, conversión y comportamiento de cliente.",
  },
];

const BENEFITS = [
  {
    icon: Store,
    title: "Una sola base operativa",
    description: "Catálogo, storefront, checkout y pedidos comparten contrato.",
  },
  {
    icon: Wallet,
    title: "Cobranza validada",
    description: "Total calculado en servidor, stock confirmado antes del pago.",
  },
  {
    icon: Truck,
    title: "Logística conectada",
    description: "Cotización, etiquetas y tracking dentro del mismo flujo.",
  },
  {
    icon: ShoppingBag,
    title: "Marketplace de apps",
    description: "Reseñas, recuperación de carrito, bundles, fidelización integrados.",
  },
];

function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-5">
      {children}
    </p>
  );
}

export default function MarketingLandingPage() {
  return (
    <>
      {/* ─── Hero ─────────────────────────────────────────────────────────
          Asymmetric: copy + CTA on the left, DashboardMockup on the right.
          Dropped the 72vh empty centered hero so the page lands with
          immediate visual proof of what the product looks like. */}
      <section className="border-b border-[color:var(--hairline)] bg-[var(--surface-1)]">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_1.1fr] lg:gap-16 lg:py-24">
          <PageReveal className="max-w-2xl">
            <div className="mb-6 h-px w-10 bg-[var(--accent-500)]" aria-hidden />
            <SectionEyebrow>Infraestructura para ecommerce operativo</SectionEyebrow>

            <DisplayText as="h1" size="xl" className="mt-6 max-w-3xl">
              Tu marca adelante.
              <br />
              <span className="text-ink-5">Tu operación en orden.</span>
            </DisplayText>

            <p className="mt-6 max-w-xl text-[16px] leading-[1.65] text-ink-4 sm:text-[17px]">
              Nexora conecta catálogo, storefront, checkout, pedidos e IA sobre
              una sola base operativa. Menos fricción, más control.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link
                href="/home/register"
                className="group inline-flex h-12 min-h-12 min-w-[180px] items-center justify-center gap-2 rounded-[var(--r-md)] bg-ink-0 px-8 text-[15px] font-medium text-ink-12 transition-[background-color,transform] duration-[var(--dur-base)] hover:bg-ink-2 active:translate-y-px focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
              >
                Crear cuenta
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-[var(--dur-base)] group-hover:translate-x-0.5"
                  strokeWidth={1.75}
                />
              </Link>
              <Link
                href="/home/pricing"
                className="inline-flex h-12 min-h-12 min-w-[180px] items-center justify-center rounded-[var(--r-md)] border border-[color:var(--hairline-strong)] bg-[var(--surface-paper)] px-8 text-[15px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)] active:translate-y-px focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
              >
                Ver planes
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-[12px] text-ink-5">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[var(--signal-success)]" strokeWidth={2} />
                Mercado Pago listo
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[var(--signal-success)]" strokeWidth={2} />
                Dominio propio
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[var(--signal-success)]" strokeWidth={2} />
                IA integrada
              </span>
            </div>
          </PageReveal>

          <Reveal delay={0.1}>
            <DashboardMockup />
          </Reveal>
        </div>
      </section>

      {/* ─── Pillars strip ────────────────────────────────────────────── */}
      <section className="bg-[var(--surface-paper)] py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <StaggerGroup className="grid grid-cols-1 gap-0 border-y border-[color:var(--hairline)] lg:grid-cols-4">
            {OPERATING_PILLARS.map((pillar, index) => (
              <StaggerItem key={pillar.title} className="px-1 py-8 sm:px-2 lg:py-10">
                <div className="grid grid-cols-[1fr_auto] items-start gap-4 lg:block">
                  <div>
                    <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-ink-0">
                      {pillar.title}
                    </h2>
                    <p className="mt-3 max-w-xs text-[14px] leading-[1.65] text-ink-5">
                      {pillar.description}
                    </p>
                  </div>
                  <span className="tabular text-[11px] font-medium text-ink-6 lg:mt-8 lg:block">
                    0{index + 1}
                  </span>
                </div>
                {index < OPERATING_PILLARS.length - 1 && (
                  <Hairline className="mt-8 lg:hidden" />
                )}
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* ─── Product modules ─────────────────────────────────────────────
          Three illustrated cards that show what the merchant actually
          gets inside each major area. Numbers in chips are labelled
          "ejemplo" so nothing reads as a real result claim. */}
      <section className="bg-[var(--surface-1)] py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <div className="max-w-2xl">
              <SectionEyebrow>Lo que vas a usar todos los días</SectionEyebrow>
              <DisplayText as="h2" size="md" className="mt-4">
                Módulos diseñados para operar, no para mostrar.
              </DisplayText>
              <p className="mt-4 text-[15px] leading-[1.65] text-ink-4">
                Cada módulo lee del mismo dato real: catálogo, ventas, stock y
                cliente. Lo que ves es lo que está pasando.
              </p>
            </div>
          </Reveal>

          <StaggerGroup className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
            {PRODUCT_MODULES.map((mod) => (
              <StaggerItem key={mod.title}>
                <article className="group flex h-full flex-col gap-5 rounded-[var(--r-lg)] border border-[color:var(--card-border)] bg-[var(--surface-paper)] p-6 shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-card-hover)]">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--r-md)] bg-[var(--brand-soft)] text-[var(--brand)]">
                      <mod.icon className="h-5 w-5" strokeWidth={1.75} />
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-ink-6 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-ink-0">
                      {mod.title}
                    </h3>
                    <p className="mt-2 text-[14px] leading-[1.6] text-ink-5">
                      {mod.description}
                    </p>
                  </div>
                  <div className="mt-auto flex flex-wrap gap-1.5">
                    {mod.chips.map((chip) => (
                      <span
                        key={chip}
                        className="inline-flex items-center rounded-full border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2.5 py-1 text-[11px] font-medium text-ink-4"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </article>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* ─── How it works ────────────────────────────────────────────── */}
      <section className="bg-[var(--surface-paper)] py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <div className="max-w-2xl">
              <SectionEyebrow>Cómo funciona</SectionEyebrow>
              <DisplayText as="h2" size="md" className="mt-4">
                De catálogo a venta en tres pasos claros.
              </DisplayText>
            </div>
          </Reveal>

          <StaggerGroup className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-[var(--r-lg)] border border-[color:var(--card-border)] bg-[color:var(--hairline)] md:grid-cols-3">
            {HOW_IT_WORKS.map((step) => (
              <StaggerItem key={step.step}>
                <div className="flex h-full flex-col gap-6 bg-[var(--surface-paper)] p-7">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold tracking-[0.16em] text-ink-6">
                      PASO {step.step}
                    </span>
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">
                      <step.icon className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                  </div>
                  <div>
                    <h3 className="text-[16px] font-semibold tracking-[-0.02em] text-ink-0">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-[14px] leading-[1.6] text-ink-5">
                      {step.description}
                    </p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* ─── Benefits ────────────────────────────────────────────────── */}
      <section className="bg-[var(--surface-1)] py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Reveal>
            <div className="max-w-2xl">
              <SectionEyebrow>Por qué Nexora</SectionEyebrow>
              <DisplayText as="h2" size="md" className="mt-4">
                Una capa operativa diseñada para crecer sin romperse.
              </DisplayText>
            </div>
          </Reveal>

          <StaggerGroup className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((benefit) => (
              <StaggerItem key={benefit.title}>
                <div className="flex h-full flex-col gap-4 rounded-[var(--r-lg)] border border-[color:var(--card-border)] bg-[var(--surface-paper)] p-6 shadow-[var(--shadow-soft)]">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">
                    <benefit.icon className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <div>
                    <h3 className="text-[15px] font-semibold tracking-[-0.015em] text-ink-0">
                      {benefit.title}
                    </h3>
                    <p className="mt-2 text-[13.5px] leading-[1.6] text-ink-5">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* ─── Final CTA ─────────────────────────────────────────────── */}
      <section className="border-t border-[color:var(--hairline)] bg-[var(--surface-paper)] py-20 sm:py-24">
        <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
          <PageReveal delay={0.05}>
            <div className="mx-auto mb-6 h-px w-10 bg-[var(--accent-500)]" aria-hidden />
            <DisplayText as="h2" size="md" className="text-center">
              Menos ruido.
              <br />
              <span className="text-ink-5">Más criterio operativo.</span>
            </DisplayText>

            <p className="mx-auto mt-6 max-w-xl text-[15px] leading-[1.65] text-ink-4">
              Empezá con una base más clara para vender, cobrar y ordenar tu
              operación desde el primer día.
            </p>

            <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link
                href="/home/register"
                className="group inline-flex h-12 min-h-12 min-w-[200px] items-center justify-center gap-2 rounded-[var(--r-md)] bg-ink-0 px-8 text-[15px] font-medium text-ink-12 transition-colors hover:bg-ink-2 active:translate-y-px focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
              >
                Empezar con Nexora
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-[var(--dur-base)] group-hover:translate-x-0.5"
                  strokeWidth={1.75}
                />
              </Link>
              <Link
                href="/home/pricing"
                className="inline-flex h-12 min-h-12 min-w-[200px] items-center justify-center rounded-[var(--r-md)] border border-[color:var(--hairline-strong)] bg-[var(--surface-paper)] px-8 text-[15px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)] active:translate-y-px focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
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
