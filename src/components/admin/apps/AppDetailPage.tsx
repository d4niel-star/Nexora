"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ExternalLink, Loader2, Power } from "lucide-react";

import { cn } from "@/lib/utils";
import { APP_CATEGORIES } from "@/lib/apps/registry";
import type { AppCatalogItem } from "@/lib/apps/queries";
import {
  installAppAction,
  toggleAppAction,
  uninstallAppAction,
} from "@/lib/apps/actions";

import { AppStatusBadge } from "./AppStatusBadge";
import { getAppIcon } from "./appIcons";

interface Props {
  item: AppCatalogItem;
}

const primaryBtn =
  "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[var(--r-sm)] bg-ink-0 text-[12px] font-medium text-ink-12 transition-colors hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]";
const secondaryBtn =
  "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] text-[12px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)] disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]";
const ghostBtn =
  "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[var(--r-sm)] text-[12px] font-medium text-ink-5 transition-colors hover:bg-[var(--surface-2)] disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]";

export function AppDetailPage({ item }: Props) {
  const router = useRouter();
  const { definition, availability, state } = item;
  const Icon = getAppIcon(definition.iconName);
  const categoryLabel =
    APP_CATEGORIES.find((c) => c.key === definition.category)?.label ??
    definition.category;

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handle = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setErrorMsg(mapError(res.error));
        return;
      }
      router.refresh();
    });
  };

  const locked =
    availability.kind === "coming-soon" || availability.kind === "plan-locked";

  return (
    <div className="animate-in fade-in duration-[var(--dur-slow)] space-y-8">
      <Link
        href="/admin/apps"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-5 hover:text-ink-0 transition-colors focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
        Volver al catálogo
      </Link>

      {/* Header */}
      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6 lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
              <Icon className="h-6 w-6 text-ink-0" strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
                  {categoryLabel}
                </span>
                <span className="text-ink-6">·</span>
                <AppStatusBadge availability={availability} installState={state} />
              </div>
              <h1 className="mt-2 text-[24px] lg:text-[28px] font-semibold leading-[1.12] tracking-[-0.025em] text-ink-0">
                {definition.name}
              </h1>
              <p className="mt-2 max-w-2xl text-[14px] leading-[1.55] text-ink-5">
                {definition.shortDescription}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {availability.kind === "plan-locked" && (
              <div className="flex w-full flex-col gap-3 sm:w-auto">
                {definition.lockedMessage && (
                  <p className="max-w-sm text-[12px] font-medium leading-[1.5] text-ink-5">
                    {definition.lockedMessage}
                  </p>
                )}
                <Link href="/admin/billing" className={cn(primaryBtn, "sm:w-max")}>
                  Ver plan {availability.minPlan}
                </Link>
              </div>
            )}

            {availability.kind === "coming-soon" && (
              <button type="button" disabled className={secondaryBtn}>
                Próximamente
              </button>
            )}

            {availability.kind === "available" && !state.installed && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => handle(() => installAppAction(definition.slug))}
                className={primaryBtn}
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Instalar app
              </button>
            )}

            {availability.kind === "available" &&
              state.installed &&
              state.status === "active" && (
                <>
                  {definition.manageRoute && (
                    <Link href={definition.manageRoute} className={primaryBtn}>
                      <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
                      Abrir app
                    </Link>
                  )}
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handle(() => toggleAppAction(definition.slug))}
                    className={secondaryBtn}
                  >
                    <Power className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Desactivar
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      handle(() => uninstallAppAction(definition.slug))
                    }
                    className={ghostBtn}
                  >
                    Desinstalar
                  </button>
                </>
              )}

            {availability.kind === "available" &&
              state.installed &&
              state.status === "disabled" && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handle(() => toggleAppAction(definition.slug))}
                  className={primaryBtn}
                >
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Power className="h-3.5 w-3.5" />
                  )}
                  Reactivar
                </button>
              )}

            {availability.kind === "available" &&
              state.installed &&
              state.status === "needs_setup" &&
              definition.setupRoute && (
                <Link href={definition.setupRoute} className={primaryBtn}>
                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Completar setup
                </Link>
              )}
          </div>
        </div>

        {errorMsg && (
          <p
            role="alert"
            className="mt-5 text-[12px] font-medium text-[color:var(--signal-danger)]"
          >
            {errorMsg}
          </p>
        )}
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Section title="Qué problema resuelve">
            <p className="text-[14px] leading-[1.6] text-ink-3">{definition.problem}</p>
          </Section>

          <Section title="Qué ganás activándola">
            <p className="text-[14px] leading-[1.6] text-ink-3">{definition.outcome}</p>
          </Section>

          <Section title="Capacidades">
            <ul className="space-y-2">
              {definition.capabilities.map((cap, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-[13px] leading-[1.55] text-ink-3"
                >
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-5" />
                  {cap}
                </li>
              ))}
            </ul>
          </Section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5">
            <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
              Detalles
            </h3>
            <dl className="mt-3 space-y-3 text-[13px]">
              <Row label="Categoría" value={categoryLabel} />
              <Row
                label="Modo de instalación"
                value={
                  definition.installMode === "builtin"
                    ? "Integrada en Nexora"
                    : "Configuración en otra sección"
                }
              />
              {definition.setupTime && (
                <Row label="Setup estimado" value={definition.setupTime} />
              )}
              {definition.minPlanLabel && (
                <Row label="Plan mínimo" value={definition.minPlanLabel} />
              )}
              {state.installedAt && (
                <Row
                  label="Instalada"
                  value={new Intl.DateTimeFormat("es-AR", {
                    dateStyle: "medium",
                  }).format(state.installedAt)}
                />
              )}
            </dl>
          </div>

          {definition.setupRoute && !locked && (
            <Link
              href={definition.setupRoute}
              className={cn(secondaryBtn, "w-full")}
            >
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
              Ir a la configuración
            </Link>
          )}

          {definition.tags && definition.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {definition.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center h-6 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 text-[10px] font-mono text-ink-5"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5 lg:p-6">
      <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">
        {label}
      </dt>
      <dd className="text-[13px] text-ink-0 text-right">{value}</dd>
    </div>
  );
}

function mapError(code: string | undefined): string {
  switch (code) {
    case "coming_soon":
      return "Esta app aún no está disponible.";
    case "plan_locked":
      return "Tu plan actual no incluye esta app.";
    case "no_active_store":
      return "No hay una tienda activa en la sesión.";
    case "app_not_found":
      return "La app no existe en el catálogo.";
    default:
      return "Ocurrió un error procesando la solicitud.";
  }
}
