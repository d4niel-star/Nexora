import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Boxes,
  Check,
  CircleDollarSign,
  HeartHandshake,
  Layers,
  MapPin,
  Megaphone,
  Network,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  TrendingUp,
  Truck,
  Wallet,
  Zap,
} from "lucide-react";
import { CommerceOpsPreview } from "@/components/public/CommerceOpsPreview";
import { AIGrowthPreview } from "@/components/public/AIGrowthPreview";
import { PageReveal, Reveal, StaggerGroup, StaggerItem } from "@/components/public/PublicMotion";

// ─── Nexora 2027 Home — v3 (clean SaaS, Shopify-clear) ────────────────────
//
// This is the second structural rebuild of the marketing landing. The v2
// "editorial" home (text-jumbo headline + canvas-grid backdrop +
// numbered section-rule + NexoraDiagram + navy CTA closer) read as a
// monumental tech manifesto, not as a product. v3 throws all of that
// away and ships a clean SaaS landing inspired by the *clarity* of
// Shopify-class home pages — without literally cloning Shopify:
//
//   1. Light warm canvas (#f6f4ef paper). NO grid backdrop dominating
//      the page. The architectural feel comes from the hairline edges
//      of the white product cards, not from a checkered background.
//
//   2. Split hero: short, balanced H1 on the left + a real-looking
//      Nexora dashboard mock on the right (CommerceOpsPreview). The
//      mock is the visual anchor; the headline supports it instead of
//      being the entire visual.
//
//   3. Trust strip with the actual integrations — Mercado Pago, Andreani,
//      Correo Argentino, Meta, TikTok, Google — as quiet inline chips.
//
//   4. "Toda la operación" — three feature cards (Vendé / Operá / Crecé)
//      with concrete copy, not abstract "operating system" pitches.
//
//   5. AIGrowthPreview — full-width feature with a real-looking AI panel
//      (chat thread + recommendations + pixels). This is mockup #2, the
//      "automation/AI/growth" view the user explicitly asked for.
//
//   6. Modules grid (#modulos) — 6 honest cards: catálogo, inventario,
//      storefront, checkout, marketplace, logística.
//
//   7. 3-step "Cómo empezar" — clean horizontal cards, numbers tucked
//      away in a small chip, NOT the giant numbered rail.
//
//   8. Trust block — 4 explicit benefits (sin comisión por venta · MP
//      listo · soporte humano · Argentina).
//
//   9. Light CTA panel + 4-col footer (PublicFooter v3). NO navy grid
//      closer.
//
// Mocks render as real HTML/CSS components, not SVG diagrams or external
// assets — they look like actual Nexora screens, scaled.

const FEATURE_CARDS = [
  {
    icon: Store,
    title: "Vendé",
    body: "Storefront editable, checkout argentino y carrito en menos de un día. Diseño propio sin escribir CSS.",
    bullets: ["Themes editables", "Dominio propio", "Mobile-first"],
  },
  {
    icon: Layers,
    title: "Operá",
    body: "Catálogo, inventario, pedidos y proveedores sincronizados en tiempo real, en una sola pantalla.",
    bullets: ["Multi-bodega", "Stock confirmado", "Importación masiva"],
  },
  {
    icon: TrendingUp,
    title: "Crecé",
    body: "Ads conectados al catálogo, recomendaciones IA y recuperación automática trabajando juntos.",
    bullets: ["Tienda IA · copilot", "Meta · TikTok · Google", "Recuperación automática"],
  },
] as const;

const MODULES = [
  {
    icon: Layers,
    title: "Catálogo",
    body: "Productos, variantes, costos y precios desde una base unificada.",
  },
  {
    icon: Boxes,
    title: "Inventario",
    body: "Stock en tiempo real, multi-bodega y alertas de quiebre.",
  },
  {
    icon: ShoppingCart,
    title: "Checkout",
    body: "Mercado Pago, total calculado en servidor, stock validado antes del pago.",
  },
  {
    icon: Truck,
    title: "Envíos",
    body: "Andreani, Correo Argentino y carriers propios con cotización en línea.",
  },
  {
    icon: Megaphone,
    title: "Marketing",
    body: "Meta, TikTok y Google Ads conectados al catálogo y a los píxeles reales.",
  },
  {
    icon: Network,
    title: "Proveedores",
    body: "Sourcing con catálogo B2B, integraciones y predicción de stock.",
  },
] as const;

const STEPS = [
  {
    n: "01",
    title: "Conectá tu base",
    body: "Importá productos, variantes y stock. Mercado Pago listo en minutos.",
  },
  {
    n: "02",
    title: "Lanzá tu storefront",
    body: "Elegí tu tema, sumá tu dominio y publicá tu tienda en horas.",
  },
  {
    n: "03",
    title: "Vendé y crecé",
    body: "Pedidos, ads y recuperación trabajando solos sobre tus datos reales.",
  },
] as const;

const TRUST_LOGOS = [
  "Mercado Pago",
  "Andreani",
  "Correo Argentino",
  "Meta",
  "TikTok",
  "Google",
] as const;

const BENEFITS = [
  {
    icon: Wallet,
    title: "0% comisión por venta",
    body: "Pagás un plan fijo. Lo que vendés es tuyo. Sin sorpresas a fin de mes.",
  },
  {
    icon: Zap,
    title: "Listo en minutos",
    body: "Mercado Pago integrado y un theme funcional desde el primer día.",
  },
  {
    icon: HeartHandshake,
    title: "Soporte humano",
    body: "Equipo argentino que entiende tu operación. Email y WhatsApp.",
  },
  {
    icon: ShieldCheck,
    title: "Datos seguros",
    body: "Sesiones cifradas, backups automáticos y exportación de datos siempre.",
  },
] as const;

export default function MarketingLandingPage() {
  return (
    <>
      {/* ───── HERO · split with real dashboard mock ─────────────────── */}
      <section className="relative isolate overflow-hidden">
        {/* Soft brand glow at the top, NOT a checkered grid. The page
            inherits the warm paper canvas from MarketingChrome. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-32 -z-10 h-[420px] bg-[radial-gradient(50%_50%_at_50%_0%,rgba(0,0,32,0.07)_0%,transparent_70%)]"
        />

        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-5 pb-16 pt-12 sm:px-8 sm:pb-24 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
          <PageReveal>
            <span className="shop-eyebrow">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[color:var(--signal-success)]" />
              Plataforma de comercio · Argentina
            </span>

            <h1 className="shop-h1 mt-6 max-w-[18ch]">
              El sistema de comercio
              <br />
              para tu marca.{" "}
              <span className="quiet">Vendé, cobrá y crecé desde una sola base.</span>
            </h1>

            <p className="shop-lead mt-7">
              Catálogo, ventas, pagos, envíos, ads e IA en una plataforma diseñada
              en Argentina y lista para escalar. Sin agencias, sin pegamento entre apps.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/home/register"
                className="group inline-flex h-12 min-w-[200px] items-center justify-center gap-2 rounded-full bg-[var(--brand)] px-7 text-[14px] font-medium text-white transition-colors hover:bg-[var(--brand-hover)] active:translate-y-px focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
              >
                Probar gratis
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
              </Link>
              <Link
                href="/home/pricing"
                className="inline-flex h-12 min-w-[140px] items-center justify-center gap-2 rounded-full border border-[color:var(--hairline-strong)] bg-[var(--surface-paper)] px-6 text-[14px] font-medium text-ink-0 transition-colors hover:bg-[rgba(0,0,32,0.04)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
              >
                Ver planes
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12.5px] text-ink-5">
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-[color:var(--signal-success)]" strokeWidth={2.5} />
                14 días gratis
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-[color:var(--signal-success)]" strokeWidth={2.5} />
                Sin tarjeta
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-[color:var(--signal-success)]" strokeWidth={2.5} />
                Setup en minutos
              </span>
            </div>
          </PageReveal>

          {/* ── Mockup 1: CommerceOpsPreview ── */}
          <Reveal className="relative">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-6 -z-10 rounded-[28px] bg-[radial-gradient(50%_60%_at_50%_50%,rgba(63,79,154,0.18)_0%,transparent_70%)]"
            />
            <CommerceOpsPreview className="w-full" />
            <p className="mt-3 text-center text-[11px] text-ink-6">
              Vista previa de la consola Nexora · datos de ejemplo
            </p>
          </Reveal>
        </div>

        {/* Trust strip — quiet integrations row, NOT a feature grid. */}
        <div className="border-y border-[color:var(--hairline)] bg-[rgba(0,0,32,0.02)]">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-5 py-6 sm:px-8">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-6">
              Integrado con
            </span>
            {TRUST_LOGOS.map((logo) => (
              <span key={logo} className="text-[12.5px] font-medium text-ink-3">
                {logo}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ───── FEATURES · 3 cards (Vendé / Operá / Crecé) ────────────── */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
        <Reveal>
          <span className="shop-eyebrow">Toda la operación</span>
          <h2 className="shop-h2 mt-6 max-w-[20ch]">
            Una plataforma completa.{" "}
            <span className="text-ink-5">Vos sólo te enfocás en vender.</span>
          </h2>
        </Reveal>

        <StaggerGroup className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {FEATURE_CARDS.map(({ icon: Icon, title, body, bullets }) => (
            <StaggerItem key={title}>
              <article className="shop-card flex h-full flex-col gap-5 p-7 sm:p-8">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--brand)] text-white">
                  <Icon className="h-4.5 w-4.5" strokeWidth={2} />
                </span>
                <div>
                  <h3 className="text-[22px] font-semibold tracking-[-0.025em] text-ink-0">
                    {title}
                  </h3>
                  <p className="mt-2 text-[14px] leading-[1.6] text-ink-5">{body}</p>
                </div>
                <ul className="mt-auto flex flex-col gap-2 border-t border-[color:var(--hairline)] pt-4">
                  {bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-[13px] text-ink-2">
                      <Check className="h-3.5 w-3.5 text-[color:var(--signal-success)]" strokeWidth={2.5} />
                      {b}
                    </li>
                  ))}
                </ul>
              </article>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </section>

      {/* ───── AI / GROWTH · full-width with mockup #2 ───────────────── */}
      <section className="border-y border-[color:var(--hairline)] bg-[#efece4]">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[1fr_1.15fr] lg:gap-14">
          <Reveal>
            <span className="shop-eyebrow">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
              Tienda IA · copilot
            </span>
            <h2 className="shop-h2 mt-6 max-w-[18ch]">
              Una IA que conoce tu tienda.{" "}
              <span className="text-ink-5">Y sabe qué hacer.</span>
            </h2>
            <p className="shop-lead mt-6">
              Nexora IA aprende de tus datos reales — pedidos, stock, campañas — y
              propone acciones concretas. Vos decidís, Nexora ejecuta.
            </p>

            <ul className="mt-7 flex flex-col gap-3 text-[14px] text-ink-2">
              <li className="flex items-start gap-2">
                <ArrowUpRight className="mt-0.5 h-4 w-4 text-[var(--brand)]" strokeWidth={2} />
                Recuperación automática por email y WhatsApp.
              </li>
              <li className="flex items-start gap-2">
                <ArrowUpRight className="mt-0.5 h-4 w-4 text-[var(--brand)]" strokeWidth={2} />
                Recomendaciones de campañas Meta · TikTok · Google sobre datos reales.
              </li>
              <li className="flex items-start gap-2">
                <ArrowUpRight className="mt-0.5 h-4 w-4 text-[var(--brand)]" strokeWidth={2} />
                Píxeles conectados, atribución sin huérfanos, decisiones con criterio.
              </li>
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/home/register"
                className="group inline-flex h-11 items-center gap-1.5 rounded-full bg-[var(--brand)] px-5 text-[13.5px] font-medium text-white transition-colors hover:bg-[var(--brand-hover)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
              >
                Probar Tienda IA
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
              </Link>
            </div>
          </Reveal>

          <Reveal className="relative">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-4 -z-10 rounded-[28px] bg-[radial-gradient(50%_60%_at_50%_50%,rgba(63,79,154,0.20)_0%,transparent_70%)]"
            />
            <AIGrowthPreview />
            <p className="mt-3 text-center text-[11px] text-ink-6">
              Vista previa del copilot Nexora IA · datos de ejemplo
            </p>
          </Reveal>
        </div>
      </section>

      {/* ───── MODULES · 6-card grid ─────────────────────────────────── */}
      <section
        id="modulos"
        className="mx-auto max-w-7xl scroll-mt-24 px-5 py-20 sm:px-8 sm:py-24"
      >
        <Reveal>
          <span className="shop-eyebrow">Módulos</span>
          <h2 className="shop-h2 mt-6 max-w-[22ch]">
            Todo lo que necesitás.{" "}
            <span className="text-ink-5">Nada que sobre.</span>
          </h2>
          <p className="shop-lead mt-6">
            Cada módulo está pensado para vivir junto al resto: catálogo, stock,
            ventas, pagos, envíos y crecimiento, todos sobre un mismo dato real.
          </p>
        </Reveal>

        <StaggerGroup className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-[var(--r-xl)] border border-[color:var(--card-border)] bg-[color:var(--hairline)] sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map(({ icon: Icon, title, body }) => (
            <StaggerItem key={title}>
              <div className="flex h-full flex-col gap-3 bg-[var(--surface-paper)] p-6 sm:p-7">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(0,0,32,0.05)] text-ink-1">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <h3 className="text-[16px] font-semibold tracking-[-0.02em] text-ink-0">
                  {title}
                </h3>
                <p className="text-[13.5px] leading-[1.55] text-ink-5">{body}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </section>

      {/* ───── HOW IT WORKS · 3-step rail (clean cards) ──────────────── */}
      <section className="border-t border-[color:var(--hairline)] bg-[#f1ede5]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
          <Reveal>
            <span className="shop-eyebrow">Cómo empezar</span>
            <h2 className="shop-h2 mt-6 max-w-[22ch]">
              De catálogo a venta{" "}
              <span className="text-ink-5">en 3 pasos.</span>
            </h2>
          </Reveal>

          <StaggerGroup className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
            {STEPS.map(({ n, title, body }) => (
              <StaggerItem key={n}>
                <article className="shop-card flex h-full flex-col gap-5 p-6 sm:p-7">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-7 items-center rounded-full bg-[rgba(0,0,32,0.06)] px-2.5 text-[11px] font-semibold tracking-[0.04em] text-ink-1">
                      Paso {n}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-ink-6" strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-ink-0">
                      {title}
                    </h3>
                    <p className="mt-2 text-[13.5px] leading-[1.6] text-ink-5">{body}</p>
                  </div>
                </article>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* ───── BENEFITS · 4 cards (confianza) ───────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
        <Reveal>
          <span className="shop-eyebrow">Por qué Nexora</span>
          <h2 className="shop-h2 mt-6 max-w-[22ch]">
            Diseñado para marcas que quieren{" "}
            <span className="text-ink-5">vender en serio.</span>
          </h2>
        </Reveal>

        <StaggerGroup className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-[var(--r-xl)] border border-[color:var(--card-border)] bg-[color:var(--hairline)] sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map(({ icon: Icon, title, body }) => (
            <StaggerItem key={title}>
              <div className="flex h-full flex-col gap-3 bg-[var(--surface-paper)] p-6 sm:p-7">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand)] text-white">
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </span>
                <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-ink-0">
                  {title}
                </h3>
                <p className="text-[13px] leading-[1.55] text-ink-5">{body}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </section>

      {/* ───── FINAL CTA · light card, navy button (no grid bg) ──────── */}
      <section className="px-5 pb-20 sm:px-8 sm:pb-24">
        <div className="mx-auto max-w-7xl">
          <PageReveal>
            <div className="shop-card relative overflow-hidden p-10 sm:p-14">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-32 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,rgba(63,79,154,0.18)_0%,transparent_70%)]"
              />
              <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
                <div>
                  <span className="shop-eyebrow">
                    <MapPin className="h-3.5 w-3.5" strokeWidth={2} />
                    Hecho en Argentina
                  </span>
                  <h2 className="shop-h2 mt-5 max-w-[22ch]">
                    Empezá hoy.{" "}
                    <span className="text-ink-5">Sin riesgo, sin compromiso.</span>
                  </h2>
                  <p className="shop-lead mt-5">
                    14 días gratis para probar la plataforma completa. Si te quedás,
                    elegís el plan que se ajuste a tu operación.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <Link
                    href="/home/register"
                    className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--brand)] px-7 text-[14px] font-medium text-white transition-colors hover:bg-[var(--brand-hover)] active:translate-y-px focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
                  >
                    Crear mi tienda gratis
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
                  </Link>
                  <Link
                    href="/home/pricing"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[color:var(--hairline-strong)] bg-[var(--surface-paper)] px-6 text-[14px] font-medium text-ink-0 transition-colors hover:bg-[rgba(0,0,32,0.04)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
                  >
                    Comparar planes
                  </Link>
                  <p className="mt-1 text-center text-[12px] text-ink-5">
                    Sin tarjeta · Cancelás cuando quieras
                  </p>
                </div>
              </div>
            </div>
          </PageReveal>
        </div>
      </section>
    </>
  );
}
