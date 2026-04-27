import Link from "next/link";
import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";

import type { CarrierMetadata } from "@/lib/shipping/registry";
import type { CarrierConnectionSummary } from "@/lib/shipping/types";

import { CarrierConnectionForm } from "./CarrierConnectionForm";
import { CapabilityList } from "./CapabilityList";
import { CarrierExtrasForm } from "./CarrierExtrasForm";

interface Props {
  carrier: CarrierMetadata;
  summary: CarrierConnectionSummary;
}

export function CarrierIntegrationPage({ carrier, summary }: Props) {
  const isConnected = summary.status === "connected";

  return (
    <div className="animate-in fade-in space-y-8 py-2 duration-300">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="space-y-3">
        <Link
          href="/admin/shipping"
          className="inline-flex w-fit items-center gap-1.5 text-[12px] font-medium text-ink-5 transition-colors hover:text-ink-0"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
          Envíos
        </Link>
        <div className="space-y-2">
          <h1 className="text-[28px] font-semibold leading-[1.08] tracking-[-0.035em] text-ink-0 lg:text-[32px]">
            {carrier.name}
          </h1>
          <p className="max-w-2xl text-[13px] leading-[1.55] text-ink-5">
            {carrier.tagline}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <a
            href={carrier.docsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[color:var(--hairline)] bg-[var(--surface-1)] px-3.5 text-[12px] font-medium text-ink-3 transition-colors hover:bg-[var(--surface-2)]"
          >
            Documentación API
            <ExternalLink className="h-3 w-3" strokeWidth={1.75} />
          </a>
          <a
            href={carrier.credentialsRequestUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[color:var(--hairline)] bg-[var(--surface-1)] px-3.5 text-[12px] font-medium text-ink-3 transition-colors hover:bg-[var(--surface-2)]"
          >
            Solicitar credenciales
            <ExternalLink className="h-3 w-3" strokeWidth={1.75} />
          </a>
        </div>
      </header>

      {/* ── Connection form ────────────────────────────────────────── */}
      <CarrierConnectionForm
        carrierId={carrier.id}
        carrierName={carrier.name}
        requiresClientNumber={carrier.requiresClientNumber}
        requiresContractNumber={carrier.requiresContractNumber}
        supportsSandbox={carrier.supportsSandbox}
        summary={summary}
      />

      {/* ── Carrier-specific extras ────────────────────────────────── */}
      {carrier.requiresContractNumber && isConnected ? (
        <CarrierExtrasForm
          carrierId={carrier.id}
          contractNumber={
            typeof summary.config.contractNumber === "string"
              ? (summary.config.contractNumber as string)
              : ""
          }
        />
      ) : null}

      {/* ── Capabilities ──────────────────────────────────────────── */}
      <CapabilityList
        capabilities={carrier.adapter.capabilities}
        notes={carrier.capabilityNotes}
      />

      {/* ── Security notes ─────────────────────────────────────────── */}
      <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
        <header className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-ink-3" strokeWidth={1.75} />
          <h2 className="text-[14px] font-semibold text-ink-0">
            Tratamiento de credenciales
          </h2>
        </header>
        <ul className="mt-3 space-y-2 text-[12px] leading-[1.6] text-ink-5">
          <li>
            <span className="font-semibold text-ink-3">Cifrado en reposo.</span>{" "}
            La contraseña se cifra con AES-256-CBC usando la misma{" "}
            <code>ENCRYPTION_KEY</code> que protege a Mercado Pago, Google Ads
            y los demás secretos por tienda.
          </li>
          <li>
            <span className="font-semibold text-ink-3">Bearer efímero.</span> El
            token de autenticación que devuelve {carrier.name} es de uso único:
            se solicita on-demand y se descarta después de cada operación.
            Nexora no lo persiste.
          </li>
          <li>
            <span className="font-semibold text-ink-3">Desconexión limpia.</span>{" "}
            Al desconectar, eliminamos por completo la fila de tu base: no
            queda ningún secreto residual en disco.
          </li>
        </ul>
      </section>
    </div>
  );
}
