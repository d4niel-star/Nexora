import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DisplayText, Hairline, Surface } from "@/components/ui/primitives";

const OPERATING_PILLARS = [
  {
    title: "Catálogo centralizado",
    description:
      "Productos, variantes, precios y atributos ordenados sobre una sola base.",
  },
  {
    title: "Storefront propio",
    description:
      "Marca, dominio y experiencia de compra conectados con tu operación real.",
  },
  {
    title: "Checkout validado",
    description:
      "Mercado Pago, stock en tiempo real y pedidos sincronizados desde el origen.",
  },
  {
    title: "Operación unificada",
    description:
      "Inventario, órdenes, abastecimiento e IA dentro del mismo sistema.",
  },
];

const DECISION_COLUMNS = [
  {
    title: "Vender",
    description:
      "Mostrá tu tienda con una presencia seria, clara y lista para convertir en mobile.",
  },
  {
    title: "Operar",
    description:
      "Controlá catálogo, stock, checkout y pedidos sin saltar entre herramientas.",
  },
  {
    title: "Escalar",
    description:
      "Sumá IA, abastecimiento y automatización sobre una base que ya está ordenada.",
  },
];

const CONNECTED_MODULES = [
  {
    label: "Catálogo",
    detail: "Variantes, precios, costos y estructura listos para publicar.",
  },
  {
    label: "Inventario",
    detail: "Stock disponible y movimientos conectados con la venta real.",
  },
  {
    label: "Storefront",
    detail: "Dominio propio, colecciones y producto final dentro de tu marca.",
  },
  {
    label: "Checkout",
    detail: "Pago validado, total calculado en servidor y seguimiento posterior.",
  },
  {
    label: "Pedidos",
    detail: "Operación comercial y fulfillment sin perder el contexto del cliente.",
  },
  {
    label: "Nexora AI",
    detail: "Recomendaciones y ejecución sobre datos operativos, no sobre humo.",
  },
];

function Wordmark({ size = "sm" }: { size?: "sm" | "md" }) {
  const dim = size === "md" ? "h-3 w-3" : "h-2.5 w-2.5";
  const label = size === "md" ? "text-[15px]" : "text-[13px]";

  return (
    <div className="flex items-center gap-2">
      <span className="relative inline-flex items-center justify-center" aria-hidden>
        <span
          className={`block translate-x-[2px] translate-y-[2px] rounded-[2px] bg-ink-0 ${dim}`}
        />
        <span
          className={`absolute -translate-x-[2px] -translate-y-[2px] rounded-[2px] bg-[var(--accent-500)] ${dim}`}
        />
      </span>
      <span
        className={`font-semibold leading-none tracking-[-0.03em] text-ink-0 ${label}`}
      >
        nexora
      </span>
    </div>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-5">
      {children}
    </p>
  );
}

export default function MarketingLandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--surface-1)] text-ink-0 selection:bg-ink-0 selection:text-ink-12">
      <header className="border-b border-[color:var(--hairline)] bg-[var(--surface-0)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/home" aria-label="Nexora">
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
              className="inline-flex h-10 items-center gap-1.5 rounded-[var(--r-sm)] bg-ink-0 px-4 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2"
            >
              Empezar
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-5 pb-18 pt-16 sm:px-8 sm:pb-24 sm:pt-24">
          <div className="max-w-4xl">
            <SectionEyebrow>Infraestructura para ecommerce operativo</SectionEyebrow>

            <DisplayText as="h1" size="xl" className="mt-6 max-w-4xl">
              Tu marca adelante.
              <br />
              <span className="text-ink-5">Tu operación en orden.</span>
            </DisplayText>

            <p className="mt-6 max-w-2xl text-[16px] leading-[1.6] text-ink-4 sm:text-[17px]">
              Nexora conecta catálogo, storefront, checkout, pedidos e IA sobre
              una sola base operativa. Menos fricción, más control.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/home/register"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--r-sm)] bg-ink-0 px-6 text-[14px] font-medium text-ink-12 transition-colors hover:bg-ink-2"
              >
                Crear cuenta
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
              </Link>
              <Link
                href="/home/pricing"
                className="inline-flex h-12 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-transparent px-6 text-[14px] font-medium text-ink-0 transition-colors hover:bg-ink-11"
              >
                Ver planes
              </Link>
            </div>
          </div>

          <Surface
            level={0}
            hairline
            radius="lg"
            className="mt-14 overflow-hidden sm:mt-18"
          >
            <div className="flex min-h-12 items-center justify-between px-5 text-[11px] font-medium uppercase tracking-[0.16em] text-ink-5 sm:px-6">
              <span>Base operativa</span>
              <span>Catálogo · storefront · checkout</span>
            </div>

            <Hairline />

            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="p-5 sm:p-8">
                <SectionEyebrow>Storefront</SectionEyebrow>
                <h2 className="mt-4 text-[30px] font-semibold leading-[1.04] tracking-[-0.03em] text-ink-0 sm:text-[40px]">
                  Una presencia más seria para vender mejor.
                </h2>
                <p className="mt-4 max-w-xl text-[14px] leading-[1.6] text-ink-5">
                  La tienda, el checkout y la operación comparten el mismo criterio:
                  claridad, velocidad y una sensación premium sin ruido visual.
                </p>

                <div className="mt-8 grid gap-0 border border-[color:var(--hairline)] bg-[var(--surface-1)] sm:grid-cols-[1.15fr_0.85fr]">
                  <div className="border-b border-[color:var(--hairline)] p-4 sm:border-b-0 sm:border-r sm:p-5">
                    <div className="mb-4 flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.16em] text-ink-5">
                      <span>Tienda</span>
                      <span>Dominio propio</span>
                    </div>

                    <div className="aspect-[4/3] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-4">
                      <div className="flex items-center justify-between text-[11px] font-medium text-ink-5">
                        <span>Inicio</span>
                        <span>Colecciones</span>
                      </div>
                      <div className="mt-5 max-w-[75%]">
                        <div className="h-2.5 w-16 bg-ink-9" />
                        <div className="mt-4 h-6 w-full max-w-[12rem] bg-ink-10" />
                        <div className="mt-2 h-6 w-4/5 bg-ink-10" />
                        <div className="mt-5 h-2 w-full max-w-[14rem] bg-ink-9" />
                        <div className="mt-2 h-2 w-5/6 bg-ink-9" />
                      </div>
                      <div className="mt-7 grid grid-cols-3 gap-2">
                        <div className="aspect-[3/4] border border-[color:var(--hairline)] bg-[var(--surface-2)]" />
                        <div className="aspect-[3/4] border border-[color:var(--hairline)] bg-[var(--surface-2)]" />
                        <div className="aspect-[3/4] border border-[color:var(--hairline)] bg-[var(--surface-2)]" />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5">
                    <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-5">
                      Checkout
                    </div>
                    <div className="mt-4 space-y-4">
                      {[
                        "Mercado Pago integrado",
                        "Stock validado antes de pagar",
                        "Pedidos sincronizados al confirmar",
                      ].map((item) => (
                        <div key={item}>
                          <div className="text-[13px] font-medium text-ink-0">
                            {item}
                          </div>
                          <div className="mt-2 h-px w-full bg-[color:var(--hairline)]" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-[color:var(--hairline)] bg-[var(--surface-1)] p-5 sm:p-8 lg:border-l lg:border-t-0">
                <SectionEyebrow>Sincronización</SectionEyebrow>
                <div className="mt-5 space-y-5">
                  {OPERATING_PILLARS.map((pillar, index) => (
                    <div key={pillar.title}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[14px] font-medium text-ink-0">
                            {pillar.title}
                          </p>
                          <p className="mt-2 text-[13px] leading-[1.55] text-ink-5">
                            {pillar.description}
                          </p>
                        </div>
                        <span className="tabular text-[11px] font-medium text-ink-6">
                          0{index + 1}
                        </span>
                      </div>
                      {index < OPERATING_PILLARS.length - 1 && (
                        <Hairline className="mt-5" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Surface>
        </section>

        <Hairline />

        <section className="mx-auto max-w-6xl px-5 py-18 sm:px-8 sm:py-24">
          <div className="grid grid-cols-1 gap-y-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-x-16">
            <div>
              <SectionEyebrow>Dirección</SectionEyebrow>
              <DisplayText as="h2" size="md" className="mt-5">
                Una plataforma sobria.
                <br />
                <span className="text-ink-5">Preparada para crecer.</span>
              </DisplayText>
            </div>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6">
              {DECISION_COLUMNS.map((column, index) => (
                <div key={column.title} className="pt-4 sm:pt-0">
                  <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-6">
                    0{index + 1}
                  </div>
                  <h3 className="mt-4 text-[16px] font-semibold tracking-[-0.01em] text-ink-0">
                    {column.title}
                  </h3>
                  <p className="mt-3 text-[14px] leading-[1.6] text-ink-5">
                    {column.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Hairline />

        <section className="mx-auto max-w-6xl px-5 py-18 sm:px-8 sm:py-24">
          <div className="max-w-2xl">
            <SectionEyebrow>Todo queda conectado</SectionEyebrow>
            <h2 className="mt-5 text-[32px] font-semibold leading-[1.06] tracking-[-0.03em] text-ink-0 sm:text-[42px]">
              Cada parte del negocio habla el mismo idioma.
            </h2>
          </div>

          <div className="mt-12 border-y border-[color:var(--hairline)]">
            {CONNECTED_MODULES.map((module, index) => (
              <div key={module.label}>
                <div className="grid grid-cols-1 gap-3 py-5 sm:grid-cols-[0.28fr_0.72fr] sm:items-start sm:gap-6">
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
        </section>

        <Hairline />

        <section className="mx-auto max-w-3xl px-5 py-18 text-center sm:px-8 sm:py-24">
          <DisplayText as="h2" size="md">
            Menos ruido.
            <br />
            <span className="text-ink-5">Más criterio operativo.</span>
          </DisplayText>

          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-[1.6] text-ink-4">
            Creá tu cuenta y empezá con una base más clara para vender, cobrar y
            ordenar tu operación.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/home/register"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[var(--r-sm)] bg-ink-0 px-7 text-[14px] font-medium text-ink-12 transition-colors hover:bg-ink-2 sm:w-auto"
            >
              Empezar con Nexora
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
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

      <footer className="border-t border-[color:var(--hairline)] bg-[var(--surface-0)]">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-5 py-10 sm:flex-row sm:items-center sm:px-8">
          <Wordmark size="sm" />
          <p className="text-[12px] text-ink-5">
            © {new Date().getFullYear()} Nexora. Infraestructura para ecommerce
            inteligente.
          </p>
        </div>
      </footer>
    </div>
  );
}
