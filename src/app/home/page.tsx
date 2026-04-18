import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DisplayText, Hairline, Surface } from "@/components/ui/primitives";

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
    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-5">
      {children}
    </p>
  );
}

export default function MarketingLandingPage() {
  return (
    <>
      <section className="mx-auto flex min-h-[72vh] max-w-7xl items-center justify-center px-5 py-16 sm:px-8 sm:py-24">
        <div className="max-w-5xl text-center">
          <SectionEyebrow>Infraestructura para ecommerce operativo</SectionEyebrow>

          <DisplayText as="h1" size="xl" className="mx-auto mt-6 max-w-5xl text-center">
            Tu marca adelante.
            <br />
            <span className="text-ink-5">Tu operacion en orden.</span>
          </DisplayText>

          <p className="mx-auto mt-7 max-w-2xl text-[16px] leading-[1.65] text-ink-4 sm:text-[17px]">
            Nexora conecta catalogo, storefront, checkout, pedidos e IA sobre
            una sola base operativa. Menos friccion, mas control.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/home/register"
              className="inline-flex h-12 min-w-[170px] items-center justify-center gap-2 rounded-[var(--r-sm)] bg-ink-0 px-6 text-[14px] font-medium text-ink-12 transition-colors hover:bg-ink-2"
            >
              Crear cuenta
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
            </Link>
            <Link
              href="/home/pricing"
              className="inline-flex h-12 min-w-[170px] items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-transparent px-6 text-[14px] font-medium text-ink-0 transition-colors hover:bg-ink-11"
            >
              Ver planes
            </Link>
          </div>
        </div>
      </section>

      <Hairline />

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="grid grid-cols-1 gap-0 border-y border-[color:var(--hairline)] lg:grid-cols-4">
          {OPERATING_PILLARS.map((pillar, index) => (
            <div key={pillar.title} className="py-6 lg:py-8">
              <div className="grid grid-cols-[1fr_auto] items-start gap-4 lg:block">
                <div>
                  <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink-0">
                    {pillar.title}
                  </h2>
                  <p className="mt-3 max-w-xs text-[14px] leading-[1.6] text-ink-5">
                    {pillar.description}
                  </p>
                </div>
                <span className="tabular text-[11px] font-medium text-ink-6 lg:mt-6 lg:block">
                  0{index + 1}
                </span>
              </div>
              {index < OPERATING_PILLARS.length - 1 && (
                <Hairline className="mt-6 lg:hidden" />
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        <Surface level={0} hairline radius="lg" className="overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="p-6 sm:p-8 lg:p-10">
              <SectionEyebrow>Base operativa</SectionEyebrow>
              <h2 className="mt-5 max-w-xl text-[30px] font-semibold leading-[1.06] tracking-[-0.03em] text-ink-0 sm:text-[42px]">
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
                    <div className="py-4 text-[14px] leading-[1.6] text-ink-4">{item}</div>
                    {index < 2 && <Hairline />}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-[color:var(--hairline)] bg-[var(--surface-1)] p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
              <SectionEyebrow>Todo queda conectado</SectionEyebrow>

              <div className="mt-6 border-y border-[color:var(--hairline)]">
                {CONNECTED_MODULES.map((module, index) => (
                  <div key={module.label}>
                    <div className="grid grid-cols-[1fr_auto] gap-5 py-4 sm:grid-cols-[0.34fr_0.66fr]">
                      <div className="text-[14px] font-medium text-ink-0">
                        {module.label}
                      </div>
                      <div className="text-[14px] leading-[1.6] text-ink-5">
                        {module.detail}
                      </div>
                    </div>
                    {index < CONNECTED_MODULES.length - 1 && <Hairline />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Surface>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-18 text-center sm:px-8 sm:py-24">
        <DisplayText as="h2" size="md" className="text-center">
          Menos ruido.
          <br />
          <span className="text-ink-5">Mas criterio operativo.</span>
        </DisplayText>

        <p className="mx-auto mt-5 max-w-xl text-[15px] leading-[1.65] text-ink-4">
          Empeza con una base mas clara para vender, cobrar y ordenar tu
          operacion desde el primer dia.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/home/register"
            className="inline-flex h-12 min-w-[190px] items-center justify-center gap-2 rounded-[var(--r-sm)] bg-ink-0 px-7 text-[14px] font-medium text-ink-12 transition-colors hover:bg-ink-2"
          >
            Empezar con Nexora
            <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
          </Link>
          <Link
            href="/home/pricing"
            className="inline-flex h-12 min-w-[190px] items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-transparent px-7 text-[14px] font-medium text-ink-0 transition-colors hover:bg-ink-11"
          >
            Ver planes
          </Link>
        </div>
      </section>
    </>
  );
}
