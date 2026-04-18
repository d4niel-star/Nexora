"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Database,
  Globe,
  Megaphone,
  Package,
  Sparkles,
  Store,
  Truck,
} from "lucide-react";
import { DisplayText, Hairline, Surface } from "@/components/ui/primitives";

// ─── Landing ───
// Editorial rewrite of the marketing home. All copy preserved verbatim; the
// only changes are typography, spacing, surfaces, and the replacement of the
// "Linear-esque" dashboard mock with a deliberate editorial composable of
// three tokens (product tile · metric · order row) that reads like product
// output, not a screenshot template.

const VALUE_DRIVERS = [
  {
    icon: Database,
    title: "Catálogo centralizado",
    description:
      "Administrá productos, variantes, precios y atributos desde un solo lugar.",
  },
  {
    icon: Globe,
    title: "Operación centralizada",
    description:
      "Publica tu tienda propia con stock validado y operaciones centralizadas.",
  },
  {
    icon: Store,
    title: "Storefront optimizado",
    description:
      "Checkout integrado, dominio propio y listados sincronizados con tu operación.",
  },
  {
    icon: Sparkles,
    title: "Nexora AI",
    description:
      "Arquitecto de IA integrado que entiende el modelo completo de tu negocio cruzando datos reales.",
  },
  {
    icon: Package,
    title: "Abastecimiento B2B",
    description:
      "Recepción de compras y routing automático hacia proveedores dropshipping.",
  },
  {
    icon: Truck,
    title: "Logística integrada",
    description:
      "Fulfillment, tracking y carriers avanzados con soporte multi-proveedor.",
  },
  {
    icon: Megaphone,
    title: "AI: Performance & Ads",
    description:
      "Media buyer automático. Campañas sugeridas y borradores basados en margen y stock real.",
  },
];

function Wordmark({ size = "sm" }: { size?: "sm" | "md" }) {
  const dim = size === "md" ? "h-3 w-3" : "h-2.5 w-2.5";
  const label = size === "md" ? "text-[15px]" : "text-[13px]";
  return (
    <div className="flex items-center gap-2">
      <span className="relative inline-flex items-center justify-center">
        <span className={`block rounded-[3px] bg-ink-0 ${dim} translate-x-[2px] translate-y-[2px]`} />
        <span className={`absolute rounded-[3px] bg-[var(--accent-500)] ${dim} -translate-x-[2px] -translate-y-[2px]`} />
      </span>
      <span className={`font-semibold leading-none tracking-[-0.03em] text-ink-0 ${label}`}>
        nexora
      </span>
    </div>
  );
}

export default function MarketingLandingPage() {
  return (
    <div className="relative min-h-screen bg-[var(--surface-1)] text-ink-0 selection:bg-ink-0 selection:text-ink-12 overflow-x-hidden">
      {/* Silent grid — 2% opacity, acts as texture without noise */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(var(--ink-0) 1px, transparent 1px), linear-gradient(90deg, var(--ink-0) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* ─── Header ─── */}
      <header className="relative z-50">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" aria-label="Nexora">
            <Wordmark size="md" />
          </Link>
          <nav className="flex items-center gap-6 text-[13px]">
            <Link
              href="/home/pricing"
              className="hidden text-ink-5 transition-colors hover:text-ink-0 sm:inline"
            >
              Planes
            </Link>
            <Link
              href="/home/login"
              className="text-ink-5 transition-colors hover:text-ink-0"
            >
              Ingresar
            </Link>
            <Link
              href="/home/register"
              className="inline-flex h-9 items-center gap-1.5 rounded-[var(--r-sm)] bg-ink-0 px-4 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2"
            >
              Empezar
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </nav>
        </div>
        <Hairline />
      </header>

      {/* ─── Hero ─── */}
      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-5 pb-24 pt-20 sm:px-8 sm:pb-32 sm:pt-28">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl"
          >
            <div className="mb-7 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">
              <span className="h-[5px] w-[5px] rounded-full bg-[var(--accent-500)]" />
              Plataforma de ecommerce operativo
            </div>

            <DisplayText as="h1" size="xl" className="mb-6">
              Gestioná todo.
              <br />
              <span className="text-ink-5">Vendé en todos lados.</span>
            </DisplayText>

            <p className="mb-10 max-w-xl text-[17px] leading-[1.55] text-ink-4">
              Catálogo centralizado, storefront propio, IA integrada, checkout con
              Mercado Pago y operación centralizada. Todo desde un solo lugar.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/home/register"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--r-sm)] bg-ink-0 px-6 text-[14px] font-medium text-ink-12 transition-colors hover:bg-ink-2"
              >
                Empezar
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/home/pricing"
                className="inline-flex h-12 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-transparent px-6 text-[14px] font-medium text-ink-0 transition-colors hover:bg-ink-11"
              >
                Ver planes
              </Link>
            </div>
          </motion.div>

          {/* ─── Editorial composable ─── */}
          {/* Replaces the prior dashboard screenshot cliché. Three honest
              primitives (product frame · metric line · order row) rendered
              with the same surface/hairline tokens the product actually ships. */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="mt-20 grid grid-cols-1 gap-4 sm:mt-24 sm:grid-cols-12 sm:gap-5"
          >
            {/* Product frame */}
            <Surface
              level={0}
              hairline
              radius="lg"
              className="sm:col-span-5 overflow-hidden"
            >
              <div className="relative aspect-[4/5] w-full bg-[var(--ink-11)]">
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(120% 80% at 20% 10%, rgba(91,108,255,0.12), transparent 60%), radial-gradient(80% 80% at 90% 90%, rgba(10,11,14,0.06), transparent 60%)",
                  }}
                />
                <div className="absolute left-5 top-5 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-5">
                  Catálogo
                </div>
                <div className="absolute bottom-5 left-5 right-5">
                  <div className="font-semibold text-[26px] leading-[1.05] tracking-[-0.03em] text-ink-0">
                    Edición otoño
                  </div>
                  <div className="mt-1 text-[12px] text-ink-5 tabular">
                    42 referencias · stock sincronizado
                  </div>
                </div>
              </div>
            </Surface>

            {/* Metric */}
            <Surface
              level={0}
              hairline
              radius="lg"
              className="flex flex-col justify-between p-6 sm:col-span-4"
            >
              <div>
                <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-5">
                  Rendimiento
                </div>
                <div className="mt-5 font-semibold text-[56px] leading-none tracking-[-0.035em] text-ink-0 tabular">
                  2.4×
                </div>
                <p className="mt-3 text-[13px] leading-[1.55] text-ink-4">
                  Ritmo operativo sostenido con stock validado en tiempo real.
                </p>
              </div>
              <Hairline className="my-5" />
              <div className="flex items-center justify-between text-[12px] text-ink-5">
                <span>Enero → Marzo</span>
                <span className="tabular text-ink-0">+18%</span>
              </div>
            </Surface>

            {/* Order row */}
            <Surface
              level={0}
              hairline
              radius="lg"
              className="flex flex-col justify-between p-6 sm:col-span-3"
            >
              <div>
                <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-5">
                  Último pedido
                </div>
                <div className="mt-5 font-mono text-[13px] text-ink-0">
                  #4821
                </div>
                <div className="mt-1 text-[13px] text-ink-4">
                  Confirmado · envío a CABA
                </div>
              </div>
              <div className="mt-6 flex items-center gap-2 text-[12px] text-ink-5">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--signal-success)]" />
                En preparación
              </div>
            </Surface>
          </motion.div>
        </section>

        <Hairline />

        {/* ─── Value drivers ─── */}
        <section className="mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
          <div className="mb-16 max-w-2xl">
            <div className="mb-4 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">
              Infraestructura completa
            </div>
            <DisplayText as="h2" size="md">
              Todo lo que necesitás para operar.
            </DisplayText>
          </div>

          <div className="grid grid-cols-1 gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {VALUE_DRIVERS.map(({ icon: Icon, title, description }) => (
              <div key={title} className="group">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] text-ink-0 transition-colors group-hover:border-[color:var(--hairline-strong)]">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
                </div>
                <h3 className="mb-2 text-[15px] font-semibold tracking-[-0.01em] text-ink-0">
                  {title}
                </h3>
                <p className="text-[14px] leading-[1.55] text-ink-5">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <Hairline />

        {/* ─── Closing CTA ─── */}
        <section className="mx-auto max-w-3xl px-5 py-24 text-center sm:px-8 sm:py-32">
          <DisplayText as="h2" size="md" className="mb-5">
            Operación centralizada.
            <br />
            <span className="text-ink-5">Control real.</span>
          </DisplayText>
          <p className="mx-auto mb-10 max-w-md text-[15px] leading-[1.55] text-ink-4">
            Creá tu cuenta y accedé a la infraestructura operativa que tu
            negocio necesita.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/home/register"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[var(--r-sm)] bg-ink-0 px-7 text-[14px] font-medium text-ink-12 transition-colors hover:bg-ink-2 sm:w-auto"
            >
              Crear cuenta
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/home/pricing"
              className="inline-flex h-12 w-full items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-transparent px-7 text-[14px] font-medium text-ink-0 transition-colors hover:bg-ink-11 sm:w-auto"
            >
              Ver planes
            </Link>
          </div>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <footer className="relative z-10 border-t border-[color:var(--hairline)] bg-[var(--surface-1)]">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-5 py-10 sm:flex-row sm:items-center sm:px-8">
          <Wordmark size="sm" />
          <p className="text-[12px] text-ink-5">
            © {new Date().getFullYear()} Nexora Inc. Infraestructura para
            ecommerce inteligente.
          </p>
        </div>
      </footer>
    </div>
  );
}
