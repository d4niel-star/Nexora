"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  Package,
  Search,
  Settings,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { CarrierMetadata } from "@/lib/shipping/registry";
import type {
  CarrierCapabilities,
  CarrierConnectionSummary,
} from "@/lib/shipping/types";
import type { StoreShippingSettingsView } from "@/lib/shipping/store-settings";

import { CarrierStatusBadge } from "./CarrierStatusBadge";
import { QuoteCalculator } from "./QuoteCalculator";
import { CreateShipmentForm } from "./CreateShipmentForm";
import { TrackingLookup } from "./TrackingLookup";

interface CarrierEntry {
  meta: Omit<CarrierMetadata, "adapter"> & {
    capabilities: CarrierCapabilities;
  };
  summary: CarrierConnectionSummary;
}

interface Props {
  carriers: ReadonlyArray<CarrierEntry>;
  settings: StoreShippingSettingsView;
}

type Tab = "overview" | "quote" | "label" | "tracking";

const TABS: ReadonlyArray<{ id: Tab; label: string; icon: LucideIcon }> = [
  { id: "overview", label: "Resumen", icon: Truck },
  { id: "quote", label: "Cotizar", icon: Calculator },
  { id: "label", label: "Crear envío", icon: Package },
  { id: "tracking", label: "Tracking", icon: Search },
];

export function ShippingHub({ carriers, settings }: Props) {
  const [tab, setTab] = useState<Tab>("overview");

  const connectedCount = carriers.filter(
    (c) => c.summary.status === "connected",
  ).length;
  const errorCount = carriers.filter((c) => c.summary.status === "error").length;
  const hasAnyConnected = connectedCount > 0;
  const hasOrigin = !!settings.originPostalCode;

  const carrierOptions = carriers.map(({ meta, summary }) => ({
    id: meta.id,
    name: meta.name,
    connected: summary.status === "connected",
    supportsLabelPdf: meta.capabilities.labelPdf,
    publicTracking: meta.capabilities.publicTracking,
  }));

  const defaultPackage = {
    weightG: settings.defaultPackageWeightG,
    heightCm: settings.defaultPackageHeightCm,
    widthCm: settings.defaultPackageWidthCm,
    lengthCm: settings.defaultPackageLengthCm,
  };

  const defaultCarrierName =
    carriers.find((c) => c.meta.id === settings.defaultCarrier)?.meta.name ??
    null;

  return (
    <div className="animate-in fade-in space-y-8 py-2 duration-300">
      <header className="space-y-2">
        <h1 className="text-[28px] font-semibold leading-[1.08] tracking-[-0.035em] text-ink-0 lg:text-[32px]">
          Envíos
        </h1>
        <p className="max-w-2xl text-[13px] leading-[1.55] text-ink-5">
          Conectá Correo Argentino y Andreani, configurá las reglas base de
          envío y operá cotización, etiquetas y tracking desde un solo lugar.
        </p>
      </header>

      {/* ── Top stats ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Carriers conectados"
          value={`${connectedCount}/${carriers.length}`}
          tone={connectedCount > 0 ? "success" : "neutral"}
        />
        <StatCard
          label="Carrier por defecto"
          value={defaultCarrierName ?? "Sin definir"}
          tone={defaultCarrierName ? "neutral" : "warning"}
        />
        <StatCard
          label="Origen del envío"
          value={
            hasOrigin
              ? `CP ${settings.originPostalCode}${
                  settings.originCity ? ` · ${settings.originCity}` : ""
                }`
              : "Sin configurar"
          }
          tone={hasOrigin ? "neutral" : "warning"}
        />
        <StatCard
          label="Estado general"
          value={
            errorCount > 0
              ? `${errorCount} con error`
              : hasAnyConnected
                ? "Operativo"
                : "Sin operar"
          }
          tone={
            errorCount > 0 ? "danger" : hasAnyConnected ? "success" : "neutral"
          }
        />
      </div>

      {/* ── Alerts ───────────────────────────────────────────────────── */}
      {(!hasOrigin || !hasAnyConnected || errorCount > 0) && (
        <ul className="space-y-2">
          {!hasAnyConnected && (
            <Alert
              tone="info"
              title="Conectá tu primer carrier"
              body="Cargá las credenciales de Correo Argentino o Andreani para habilitar cotización, etiquetas y tracking."
              cta={{ label: "Ver carriers", href: "/admin/shipping#carriers" }}
            />
          )}
          {!hasOrigin && (
            <Alert
              tone="warning"
              title="Falta el origen del envío"
              body="Sin código postal de origen los carriers no pueden cotizar ni generar etiquetas."
              cta={{ label: "Configurar origen", href: "/admin/shipping/settings" }}
            />
          )}
          {errorCount > 0 && (
            <Alert
              tone="danger"
              title={`${errorCount} carrier${errorCount === 1 ? "" : "s"} con error de validación`}
              body="Las credenciales fueron rechazadas en la última validación. Reingresalas desde la página del carrier."
            />
          )}
        </ul>
      )}

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <div role="tablist" className="flex flex-wrap items-center gap-1 border-b border-[color:var(--hairline)]">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => setTab(id)}
              className={[
                "relative -mb-px inline-flex items-center gap-2 px-4 py-2.5 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
                active
                  ? "border-b-2 border-ink-0 text-ink-0"
                  : "border-b-2 border-transparent text-ink-5 hover:text-ink-3",
              ].join(" ")}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
              {label}
            </button>
          );
        })}
        <Link
          href="/admin/shipping/settings"
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-medium text-ink-5 transition-colors hover:text-ink-0"
        >
          <Settings className="h-3.5 w-3.5" strokeWidth={1.75} />
          Ajustes de envío
        </Link>
      </div>

      {/* ── Tab panels ───────────────────────────────────────────────── */}
      {tab === "overview" ? (
        <OverviewPanel carriers={carriers} />
      ) : tab === "quote" ? (
        <QuoteCalculator
          carriers={carrierOptions}
          defaults={defaultPackage}
          hasAnyConnected={hasAnyConnected}
          hasOrigin={hasOrigin}
        />
      ) : tab === "label" ? (
        <CreateShipmentForm
          carriers={carrierOptions}
          defaults={defaultPackage}
          hasAnyConnected={hasAnyConnected}
          hasOrigin={hasOrigin}
        />
      ) : (
        <TrackingLookup carriers={carrierOptions} />
      )}
    </div>
  );
}

function OverviewPanel({ carriers }: { carriers: ReadonlyArray<CarrierEntry> }) {
  return (
    <>
      <ul id="carriers" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {carriers.map(({ meta, summary }) => (
          <li key={meta.id}>
            <Link
              href={`/admin/shipping/${meta.slug}`}
              className="group block rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6 shadow-[var(--shadow-card)] transition-[colors,box-shadow] hover:border-[color:var(--hairline-strong)] hover:shadow-[var(--shadow-elevated)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
                    <Truck className="h-5 w-5 text-ink-3" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h2 className="text-[16px] font-semibold text-ink-0">
                      {meta.name}
                    </h2>
                    <p className="mt-1 max-w-md text-[12px] leading-[1.55] text-ink-5">
                      {meta.tagline}
                    </p>
                  </div>
                </div>
                <CarrierStatusBadge status={summary.status} />
              </div>

              <CapabilityChips
                capabilities={meta.capabilities}
                connected={summary.status === "connected"}
              />

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--hairline)] pt-4">
                <p className="text-[12px] text-ink-5">
                  {summary.status === "connected"
                    ? `Cuenta ${summary.accountDisplayName ?? summary.accountUsername ?? ""} · ambiente ${summary.environment === "sandbox" ? "Sandbox" : "Producción"}.`
                    : summary.status === "error"
                      ? (summary.lastError ?? "La última validación falló.")
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

      <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6 shadow-[var(--shadow-card)]">
        <h2 className="text-[14px] font-semibold text-ink-0">¿Cómo funciona?</h2>
        <ol className="mt-3 space-y-2 text-[12px] leading-[1.6] text-ink-5">
          <li>
            <span className="font-semibold text-ink-3">1. Conectá tu cuenta.</span>{" "}
            Cargá usuario, contraseña y número de cliente. Nexora valida con la
            API real antes de guardar nada y cifra la contraseña en reposo.
          </li>
          <li>
            <span className="font-semibold text-ink-3">2. Definí tus reglas.</span>{" "}
            En{" "}
            <Link
              href="/admin/shipping/settings"
              className="underline underline-offset-2 hover:text-ink-0"
            >
              Ajustes de envío
            </Link>{" "}
            cargás el origen, el carrier por defecto y las dimensiones del
            paquete estándar.
          </li>
          <li>
            <span className="font-semibold text-ink-3">3. Operá.</span> Cotizá
            por código postal, generá envíos, descargá etiquetas (cuando el
            carrier las expone) y consultá tracking en tiempo real.
          </li>
        </ol>
      </section>
    </>
  );
}

function CapabilityChips({
  capabilities,
  connected,
}: {
  capabilities: CarrierCapabilities;
  connected: boolean;
}) {
  const items: { key: keyof CarrierCapabilities; label: string }[] = [
    { key: "quoteShipment", label: "Cotizar" },
    { key: "createShipment", label: "Crear envío" },
    { key: "labelPdf", label: "Etiqueta PDF" },
    { key: "getTracking", label: "Tracking" },
  ];
  return (
    <ul className="mt-4 flex flex-wrap gap-1.5">
      {items.map((item) => {
        const supported = capabilities[item.key];
        return (
          <li
            key={item.key}
            className={[
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
              supported && connected
                ? "border-[color:var(--hairline)] bg-[var(--surface-1)] text-ink-3"
                : supported
                  ? "border-[color:var(--hairline)] bg-[var(--surface-1)] text-ink-5"
                  : "border-[color:var(--hairline)] bg-[var(--surface-0)] text-ink-6 line-through opacity-70",
            ].join(" ")}
          >
            {item.label}
          </li>
        );
      })}
    </ul>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "neutral" | "success" | "warning" | "danger";
}) {
  const accent =
    tone === "success"
      ? "text-[color:var(--signal-success)]"
      : tone === "warning"
        ? "text-[color:var(--signal-warning)]"
        : tone === "danger"
          ? "text-[color:var(--signal-danger)]"
          : "text-ink-0";
  return (
    <div className="rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-4 py-3 shadow-[var(--shadow-card)]">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
        {label}
      </p>
      <p className={["mt-1 truncate text-[14px] font-semibold", accent].join(" ")}>
        {value}
      </p>
    </div>
  );
}

function Alert({
  tone,
  title,
  body,
  cta,
}: {
  tone: "info" | "warning" | "danger";
  title: string;
  body: string;
  cta?: { label: string; href: string };
}) {
  const Icon =
    tone === "danger"
      ? AlertTriangle
      : tone === "warning"
        ? AlertTriangle
        : CheckCircle2;
  const color =
    tone === "danger"
      ? "text-[color:var(--signal-danger)]"
      : tone === "warning"
        ? "text-[color:var(--signal-warning)]"
        : "text-ink-3";
  return (
    <li>
      <div className="flex items-start gap-3 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-4">
        <Icon className={["mt-0.5 h-4 w-4 shrink-0", color].join(" ")} strokeWidth={1.75} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-ink-0">{title}</p>
          <p className="mt-0.5 text-[12px] leading-[1.55] text-ink-5">{body}</p>
        </div>
        {cta ? (
          <Link
            href={cta.href}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-[color:var(--hairline)] bg-[var(--surface-1)] px-3 text-[12px] font-medium text-ink-3 transition-colors hover:bg-[var(--surface-2)]"
          >
            {cta.label}
            <ArrowRight className="h-3 w-3" strokeWidth={1.75} />
          </Link>
        ) : null}
      </div>
    </li>
  );
}

// Re-exported so the page passes the correct type without importing from this file.
export type { CarrierEntry };
