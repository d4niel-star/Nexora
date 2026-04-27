"use client";

import { useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Plug,
  RefreshCcw,
  Unplug,
} from "lucide-react";

import {
  connectCarrierAction,
  disconnectCarrierAction,
  validateCarrierAction,
  type CarrierActionResult,
} from "@/lib/shipping/actions";
import type { CarrierConnectionSummary, CarrierEnvironment } from "@/lib/shipping/types";

import { CarrierStatusBadge } from "./CarrierStatusBadge";

interface Props {
  carrierId: "correo_argentino" | "andreani";
  carrierName: string;
  requiresClientNumber: boolean;
  /** Andreani-only: separate number tied to the negotiated rates. */
  requiresContractNumber?: boolean;
  supportsSandbox: boolean;
  summary: CarrierConnectionSummary;
}

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function CarrierConnectionForm({
  carrierId,
  carrierName,
  requiresClientNumber,
  requiresContractNumber = false,
  supportsSandbox,
  summary,
}: Props) {
  // ─── Form state ─────────────────────────────────────────────────────
  // Pre-fill non-secret fields from the existing summary so the merchant
  // can iterate without re-typing. The password input always starts blank
  // and shows a placeholder when one is already encrypted at rest.
  const [environment, setEnvironment] = useState<CarrierEnvironment>(
    summary.environment,
  );
  const [username, setUsername] = useState<string>(summary.accountUsername ?? "");
  const [clientNumber, setClientNumber] = useState<string>(
    summary.accountClientNumber ?? "",
  );
  const [contractNumber, setContractNumber] = useState<string>(
    typeof summary.config.contractNumber === "string"
      ? (summary.config.contractNumber as string)
      : "",
  );
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const isConnected = summary.status === "connected";
  const hasStoredPassword = summary.hasStoredPassword;

  function runAction(action: () => Promise<CarrierActionResult>) {
    startTransition(async () => {
      try {
        const res = await action();
        setFeedback({ tone: res.ok ? "success" : "error", message: res.message });
        if (res.ok) {
          // Clear the password input on success so it doesn't linger on
          // screen — the value is already encrypted at rest by then.
          setPassword("");
          setShowPassword(false);
        }
      } catch (err) {
        setFeedback({
          tone: "error",
          message:
            err instanceof Error
              ? `Error inesperado: ${err.message}`
              : "Error inesperado.",
        });
      }
    });
  }

  function handleConnect(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!password.trim()) {
      setFeedback({
        tone: "error",
        message: hasStoredPassword
          ? "Ingresá la contraseña para validar y guardar la conexión."
          : "Ingresá una contraseña para conectar.",
      });
      return;
    }
    runAction(() =>
      connectCarrierAction({
        carrier: carrierId,
        environment,
        username,
        password,
        clientNumber: requiresClientNumber ? clientNumber : undefined,
        contractNumber: requiresContractNumber
          ? contractNumber || undefined
          : undefined,
      }),
    );
  }

  function handleValidate() {
    runAction(() => validateCarrierAction(carrierId));
  }

  function handleDisconnect() {
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `Desconectar ${carrierName} eliminará las credenciales guardadas. ¿Continuar?`,
      )
    ) {
      return;
    }
    runAction(() => disconnectCarrierAction(carrierId));
  }

  return (
    <div className="space-y-6">
      {/* ── Status header ────────────────────────────────────────────── */}
      <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-[14px] font-semibold text-ink-0">
                Estado de la conexión
              </h2>
              <CarrierStatusBadge status={summary.status} />
            </div>
            {isConnected ? (
              <p className="text-[12px] leading-[1.55] text-ink-5">
                {summary.accountDisplayName ?? `Cuenta ${summary.accountUsername ?? ""}`} ·{" "}
                Ambiente <strong className="text-ink-3">{summary.environment === "sandbox" ? "Sandbox" : "Producción"}</strong>.
              </p>
            ) : summary.status === "error" ? (
              <p className="text-[12px] leading-[1.55] text-[color:var(--signal-danger)]">
                {summary.lastError ?? "La última validación falló. Revisá las credenciales."}
              </p>
            ) : (
              <p className="text-[12px] leading-[1.55] text-ink-5">
                Todavía no vinculaste tu cuenta de {carrierName}. Cargá las credenciales abajo
                para validar la conexión y dejar el canal listo.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {isConnected ? (
              <>
                <button
                  type="button"
                  onClick={handleValidate}
                  disabled={isPending}
                  className="inline-flex h-9 items-center gap-2 rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-3 text-[12px] font-medium text-ink-3 transition-colors hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
                >
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
                  ) : (
                    <RefreshCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
                  )}
                  Validar conexión
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={isPending}
                  className="inline-flex h-9 items-center gap-2 rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-3 text-[12px] font-medium text-[color:var(--signal-danger)] transition-colors hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
                >
                  <Unplug className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Desconectar
                </button>
              </>
            ) : null}
          </div>
        </div>

        {/* Status grid */}
        <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatItem
            label="Cuenta vinculada"
            value={summary.accountDisplayName ?? summary.accountUsername ?? "—"}
          />
          <StatItem
            label={requiresClientNumber ? "Número de cliente" : "Identificador"}
            value={summary.accountClientNumber ?? "—"}
          />
          <StatItem
            label="Última validación"
            value={
              summary.lastValidatedAt
                ? dateFmt.format(new Date(summary.lastValidatedAt))
                : "—"
            }
          />
          <StatItem
            label="Conectada desde"
            value={
              summary.connectedAt
                ? dateFmt.format(new Date(summary.connectedAt))
                : "—"
            }
          />
        </dl>
      </section>

      {/* ── Credentials form ────────────────────────────────────────── */}
      <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
        <header className="mb-5 space-y-1">
          <h2 className="text-[14px] font-semibold text-ink-0">
            {isConnected ? "Actualizar credenciales" : "Conectar cuenta"}
          </h2>
          <p className="text-[12px] leading-[1.55] text-ink-5">
            Las credenciales se almacenan cifradas en la base de datos de Nexora.
            La contraseña nunca se devuelve al cliente ni se imprime en logs.
          </p>
        </header>

        <form onSubmit={handleConnect} className="space-y-5">
          {supportsSandbox ? (
            <Field label="Ambiente">
              <div className="flex gap-2">
                {(["production", "sandbox"] as CarrierEnvironment[]).map((env) => (
                  <label
                    key={env}
                    className={[
                      "inline-flex flex-1 cursor-pointer items-center justify-center rounded-[var(--r-lg)] border px-3 py-2 text-[12px] font-medium transition-colors",
                      environment === env
                        ? "border-[color:var(--hairline-strong)] bg-[var(--surface-2)] text-ink-0"
                        : "border-[color:var(--hairline)] bg-[var(--surface-1)] text-ink-5 hover:bg-[var(--surface-2)]",
                    ].join(" ")}
                  >
                    <input
                      type="radio"
                      name="environment"
                      value={env}
                      checked={environment === env}
                      onChange={() => setEnvironment(env)}
                      className="sr-only"
                    />
                    {env === "production" ? "Producción" : "Sandbox / QA"}
                  </label>
                ))}
              </div>
            </Field>
          ) : null}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="Usuario API" required>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="block w-full rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-3 py-2 text-[13px] text-ink-0 placeholder:text-ink-6 focus:outline-none focus:shadow-[var(--shadow-focus)] focus:border-[color:var(--hairline-strong)]"
                placeholder={
                  carrierId === "andreani"
                    ? "usuario_api@empresa.com"
                    : "usuario_micorreo"
                }
                required
              />
            </Field>
            {requiresClientNumber ? (
              <Field
                label={
                  carrierId === "andreani"
                    ? "Número de cliente Andreani"
                    : "Número de cliente / Centro de costos"
                }
                required
              >
                <input
                  type="text"
                  value={clientNumber}
                  onChange={(e) => setClientNumber(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  className="block w-full rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-3 py-2 text-[13px] text-ink-0 placeholder:text-ink-6 focus:outline-none focus:shadow-[var(--shadow-focus)] focus:border-[color:var(--hairline-strong)]"
                  placeholder="00000123"
                  required
                />
              </Field>
            ) : null}
          </div>

          {requiresContractNumber ? (
            <Field
              label="Número de contrato"
              hint="Andreani: necesario para cotizar y generar etiquetas. Lo podés actualizar después desde la sección Datos de contrato."
            >
              <input
                type="text"
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="block w-full rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-3 py-2 text-[13px] text-ink-0 placeholder:text-ink-6 focus:outline-none focus:shadow-[var(--shadow-focus)] focus:border-[color:var(--hairline-strong)]"
                placeholder="400006611"
              />
            </Field>
          ) : null}

          <Field
            label="Contraseña"
            required
            hint={
              hasStoredPassword
                ? "Ya tenés una contraseña guardada cifrada. Reingresala sólo si querés actualizarla o validar la conexión."
                : "La contraseña se cifra antes de persistirla."
            }
          >
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="block w-full rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-1)] py-2 pl-3 pr-10 text-[13px] text-ink-0 placeholder:text-ink-6 focus:outline-none focus:shadow-[var(--shadow-focus)] focus:border-[color:var(--hairline-strong)]"
                placeholder={hasStoredPassword ? "•••••••••• (guardada)" : "Tu contraseña"}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[var(--r-xs)] text-ink-5 transition-colors hover:bg-[var(--surface-2)]"
              >
                {showPassword ? (
                  <EyeOff className="h-3.5 w-3.5" strokeWidth={1.75} />
                ) : (
                  <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
                )}
              </button>
            </div>
          </Field>

          {feedback ? (
            <div
              role="status"
              className={[
                "flex items-start gap-2 rounded-[var(--r-lg)] border px-4 py-3 text-[12px] leading-[1.55]",
                feedback.tone === "success"
                  ? "border-[color:var(--hairline)] bg-[var(--surface-1)] text-[color:var(--signal-success)]"
                  : "border-[color:var(--hairline)] bg-[var(--surface-1)] text-[color:var(--signal-danger)]",
              ].join(" ")}
            >
              {feedback.tone === "success" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
              )}
              <p>{feedback.message}</p>
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex h-10 items-center gap-2 rounded-[var(--r-lg)] bg-ink-0 px-5 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
              ) : (
                <Plug className="h-3.5 w-3.5" strokeWidth={1.75} />
              )}
              {isConnected ? "Actualizar conexión" : "Conectar y validar"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-4 py-3">
      <dt className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
        {label}
      </dt>
      <dd className="mt-1 truncate text-[13px] font-medium text-ink-0">{value}</dd>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[12px] font-medium text-ink-3">
        {label}
        {required ? <span className="ml-0.5 text-[color:var(--signal-danger)]">*</span> : null}
      </span>
      {children}
      {hint ? <span className="block text-[11px] leading-[1.5] text-ink-5">{hint}</span> : null}
    </label>
  );
}
