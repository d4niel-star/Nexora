import Link from "next/link";
import { ArrowRight, Truck } from "lucide-react";

import type { CarrierMetadata } from "@/lib/shipping/registry";
import type { CarrierConnectionSummary } from "@/lib/shipping/types";

import { CarrierStatusBadge } from "./CarrierStatusBadge";

interface CarrierEntry {
  meta: CarrierMetadata;
  summary: CarrierConnectionSummary;
}

interface Props {
  carriers: ReadonlyArray<CarrierEntry>;
}

export function ShippingHub({ carriers }: Props) {
  const connectedCount = carriers.filter((c) => c.summary.status === "connected").length;

  return (
    <div className="animate-in fade-in space-y-8 py-2 duration-300">
      <header className="space-y-2">
        <h1 className="text-[28px] font-semibold leading-[1.08] tracking-[-0.035em] text-ink-0 lg:text-[32px]">
          Envíos
        </h1>
        <p className="max-w-2xl text-[13px] leading-[1.55] text-ink-5">
          Centralizá tus operadores logísticos. Conectá las cuentas de los carriers con los que
          ya operás para dejar el canal de envíos listo y administrarlo desde un solo lugar.
        </p>
        <p className="text-[11px] uppercase tracking-[0.14em] text-ink-5">
          {connectedCount} de {carriers.length} carriers conectados
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {carriers.map(({ meta, summary }) => (
          <li key={meta.id}>
            <Link
              href={`/admin/shipping/${meta.slug}`}
              className="group block rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6 transition-colors hover:border-[color:var(--hairline-strong)] hover:bg-[var(--surface-1)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
                    <Truck className="h-5 w-5 text-ink-3" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h2 className="text-[16px] font-semibold text-ink-0">{meta.name}</h2>
                    <p className="mt-1 max-w-md text-[12px] leading-[1.55] text-ink-5">
                      {meta.tagline}
                    </p>
                  </div>
                </div>
                <CarrierStatusBadge status={summary.status} />
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--hairline)] pt-4">
                <p className="text-[12px] text-ink-5">
                  {summary.status === "connected"
                    ? `Cuenta ${summary.accountDisplayName ?? summary.accountUsername ?? ""} · ambiente ${summary.environment === "sandbox" ? "Sandbox" : "Producción"}.`
                    : summary.status === "error"
                      ? summary.lastError ?? "La última validación falló."
                      : "Configurá las credenciales para habilitar este canal."}
                </p>
                <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-3 transition-colors group-hover:text-ink-0">
                  {summary.status === "connected" ? "Administrar" : "Configurar"}
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
        <h2 className="text-[14px] font-semibold text-ink-0">¿Cómo funciona?</h2>
        <ol className="mt-3 space-y-2 text-[12px] leading-[1.6] text-ink-5">
          <li>
            <span className="font-semibold text-ink-3">1. Solicitá tus credenciales.</span> Cada
            carrier las entrega al firmar contrato comercial. En la página del carrier vas a
            encontrar un botón directo al formulario.
          </li>
          <li>
            <span className="font-semibold text-ink-3">2. Conectá la cuenta.</span> Cargá
            usuario, contraseña y número de cliente. Nexora hace una llamada real a la API del
            carrier para validar antes de guardar nada.
          </li>
          <li>
            <span className="font-semibold text-ink-3">3. Operá desde un solo lugar.</span>{" "}
            Una vez conectada, podés revisar el estado, validarla en cualquier momento o
            actualizar las credenciales.
          </li>
        </ol>
      </section>
    </div>
  );
}
