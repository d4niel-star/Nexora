import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DisplayText, Hairline, Surface } from "@/components/ui/primitives";
import {
  PageReveal,
  Reveal,
  StaggerGroup,
  StaggerItem,
} from "@/components/public/PublicMotion";

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

const CONNECTED_MODULES = [
  {
    label: "Catalogo",
    detail: "Variantes, precios y costos listos para publicar sin desordenar la operacion.",
  },
  {
    label: "Inventario",
    detail: "Stock disponible y movimientos vinculados con la venta real.",
  },
  {
    label: "Storefront",
    detail: "Colecciones, producto y marca dentro de una experiencia sobria y directa.",
  },
  {
    label: "Checkout",
    detail: "Total calculado en servidor, pago validado y continuidad despues de la compra.",
  },
  {
    label: "Pedidos",
    detail: "Seguimiento comercial y cumplimiento sobre la misma capa operativa.",
  },
  {
    label: "Nexora AI",
    detail: "Criterio comercial y ejecucion sobre la informacion que ya vive en tu sistema.",
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
      <section className="border-b border-[color:var(--hairline-strong)] bg-[var(--surface-1)]">
        <div className="mx-auto flex min-h-[72vh] max-w-7xl items-center justify-center px-5 py-24 sm:px-8 sm:py-32">
          <PageReveal className="max-w-5xl text-center">
            <div className="mx-auto mb-6 h-px w-10 bg-[var(--accent-500)]" aria-hidden />
            <SectionEyebrow>Infraestructura para ecommerce operativo</SectionEyebrow>

            <DisplayText as="h1" size="xl" className="mx-auto mt-8 max-w-5xl text-center">
              Tu marca adelante.
              <br />
              <span className="text-ink-5">Tu operacion en orden.</span>
            </DisplayText>

            <p className="mx-auto mt-8 max-w-2xl text-[16px] leading-[1.65] text-ink-4 sm:text-[17px]">
              Nexora conecta catalogo, storefront, checkout, pedidos e IA sobre
              una sola base operativa. Menos friccion, mas control.
            </p>

            <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
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
                className="inline-flex h-12 min-h-12 min-w-[180px] items-center justify-center rounded-[var(--r-md)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-8 text-[15px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)] active:translate-y-px focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
              >
                Ver planes
              </Link>
            </div>
          </PageReveal>
        </div>
      </section>

      <section className="bg-[var(--surface-0)] py-16 sm:py-20">
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

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <Reveal>
          <Surface
            level={0}
            hairline
            radius="lg"
            className="overflow-hidden shadow-[var(--shadow-soft)]"
          >
            <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="p-6 sm:p-8 lg:p-12">
                <SectionEyebrow>Base operativa</SectionEyebrow>
                <h2 className="mt-5 max-w-xl text-[28px] font-semibold leading-[1.08] tracking-[-0.035em] text-ink-0 sm:text-[40px]">
                  Una estructura mas limpia para vender mejor.
                </h2>
                <p className="mt-5 max-w-xl text-[14px] leading-[1.65] text-ink-5">
                  Tienda, checkout y operacion comparten el mismo criterio:
                  claridad, velocidad y una presencia mas seria de punta a punta.
                </p>

                <div className="mt-10 border-y border-[color:var(--hairline)]">
                  {[
                    "Dominio propio y experiencia de marca consistente.",
                    "Stock validado antes de cobrar.",
                    "Pedidos sincronizados despues del pago confirmado.",
                  ].map((item, index) => (
                    <div key={item}>
                      <div className="py-4 text-[14px] leading-[1.65] text-ink-4">{item}</div>
                      {index < 2 && <Hairline />}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-[color:var(--hairline)] bg-[var(--surface-1)] p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-12">
                <SectionEyebrow>Todo queda conectado</SectionEyebrow>

                <StaggerGroup
                  className="mt-6 border-y border-[color:var(--hairline)]"
                  delayChildren={0.05}
                >
                  {CONNECTED_MODULES.map((module, index) => (
                    <StaggerItem key={module.label}>
                      <div className="grid grid-cols-[1fr_auto] gap-5 py-4 sm:grid-cols-[0.34fr_0.66fr] sm:py-5">
                        <div className="text-[14px] font-medium text-ink-0">{module.label}</div>
                        <div className="text-[14px] leading-[1.65] text-ink-5">{module.detail}</div>
                      </div>
                      {index < CONNECTED_MODULES.length - 1 && <Hairline />}
                    </StaggerItem>
                  ))}
                </StaggerGroup>
              </div>
            </div>
          </Surface>
        </Reveal>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8 sm:py-28">
        <PageReveal delay={0.05}>
          <div className="mx-auto mb-6 h-px w-10 bg-[var(--accent-500)]" aria-hidden />
          <DisplayText as="h2" size="md" className="text-center">
            Menos ruido.
            <br />
            <span className="text-ink-5">Mas criterio operativo.</span>
          </DisplayText>

          <p className="mx-auto mt-6 max-w-xl text-[15px] leading-[1.65] text-ink-4">
            Empeza con una base mas clara para vender, cobrar y ordenar tu
            operacion desde el primer dia.
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
              className="inline-flex h-12 min-h-12 min-w-[200px] items-center justify-center rounded-[var(--r-md)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-8 text-[15px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)] active:translate-y-px focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
            >
              Ver planes
            </Link>
          </div>
        </PageReveal>
      </section>
    </>
  );
}
