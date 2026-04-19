"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MessageCircle,
  ShieldCheck,
  Unplug,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  saveWhatsappSettingsAction,
  disconnectWhatsappAction,
} from "@/lib/apps/whatsapp-recovery/actions";
import type { PublicWhatsappSettings } from "@/lib/apps/whatsapp-recovery/settings";

interface Props {
  settings: PublicWhatsappSettings;
  planAllows: boolean;
}

const inputCls =
  "w-full h-10 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-3 text-[13px] text-ink-0 outline-none transition-[box-shadow,border-color] placeholder:text-ink-6 focus:bg-[var(--surface-0)] focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)]";
const labelCls =
  "text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5";
const primaryBtn =
  "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[var(--r-sm)] bg-ink-0 text-[12px] font-medium text-ink-12 transition-colors hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]";
const secondaryBtn =
  "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] text-[12px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)] disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]";
const chipBase =
  "inline-flex items-center h-6 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 text-[10px] font-medium uppercase tracking-[0.14em]";

export function WhatsappSetupForm({ settings, planAllows }: Props) {
  const router = useRouter();
  const [phoneNumberId, setPhoneNumberId] = useState(
    settings.phoneNumberId ?? "",
  );
  const [accessToken, setAccessToken] = useState("");
  const [templateName, setTemplateName] = useState(settings.templateName ?? "");
  const [templateLanguage, setTemplateLanguage] = useState(
    settings.templateLanguage,
  );

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function reset() {
    setErrorMsg(null);
    setSuccessMsg(null);
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    reset();
    startTransition(async () => {
      const res = await saveWhatsappSettingsAction({
        phoneNumberId,
        // Only send the token when the user typed a fresh value.
        accessToken: accessToken.length > 0 ? accessToken : undefined,
        templateName,
        templateLanguage,
      });
      if (!res.ok) {
        setErrorMsg(
          res.error === "plan_locked"
            ? "Tu plan no incluye WhatsApp Recovery."
            : "No se pudo guardar la configuración.",
        );
        return;
      }
      setSuccessMsg("Configuración guardada.");
      setAccessToken("");
      router.refresh();
    });
  }

  function onDisconnect() {
    reset();
    if (!confirm("¿Desconectar WhatsApp Recovery? Se borrarán las credenciales.")) return;
    startTransition(async () => {
      const res = await disconnectWhatsappAction();
      if (!res.ok) {
        setErrorMsg("No se pudo desconectar.");
        return;
      }
      setSuccessMsg("WhatsApp Recovery desconectado.");
      router.refresh();
    });
  }

  const statusTone =
    settings.status === "active"
      ? "text-[color:var(--signal-success)]"
      : settings.status === "disabled"
      ? "text-ink-5"
      : "text-[color:var(--signal-warning)]";
  const statusLabel =
    settings.status === "active"
      ? "Activa"
      : settings.status === "disabled"
      ? "Desactivada"
      : "Requiere setup";

  return (
    <div className="animate-in fade-in duration-[var(--dur-slow)] space-y-6">
      <Link
        href="/admin/apps/whatsapp-recovery"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-5 hover:text-ink-0 transition-colors focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
        Volver al detalle
      </Link>

      {/* Header */}
      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
        <div className="flex items-start gap-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
            <MessageCircle className="h-5 w-5 text-ink-0" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
                Retención
              </span>
              <span className="text-ink-6">·</span>
              <span className={cn(chipBase, statusTone)}>{statusLabel}</span>
            </div>
            <h1 className="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-ink-0">
              Configurar WhatsApp Recovery
            </h1>
            <p className="mt-2 max-w-2xl text-[13px] leading-[1.55] text-ink-5">
              Credenciales de la API oficial de Meta Cloud (WABA). Nexora nunca
              envía marketing por WhatsApp sin un template aprobado por la
              plataforma.
            </p>
          </div>
        </div>
      </div>

      {!planAllows && (
        <div
          role="alert"
          className="rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-4 py-3 text-[13px] font-medium text-[color:var(--signal-warning)]"
        >
          Tu plan actual no incluye WhatsApp Recovery. Necesitás Growth o
          superior para activar esta app.
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={onSave}
        className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6 space-y-5"
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label className={labelCls} htmlFor="phoneNumberId">
              Phone Number ID
            </label>
            <input
              id="phoneNumberId"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              placeholder="123456789012345"
              disabled={!planAllows}
              className={inputCls}
            />
            <p className="text-[11px] text-ink-5">
              Lo obtenés en Meta for Developers → WhatsApp → API Setup.
            </p>
          </div>

          <div className="space-y-2">
            <label className={labelCls} htmlFor="accessToken">
              Access Token
            </label>
            <input
              id="accessToken"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder={
                settings.hasAccessToken
                  ? "••••••••••••••  (dejar vacío para no cambiar)"
                  : "EAAG..."
              }
              disabled={!planAllows}
              className={inputCls}
              autoComplete="off"
              type="password"
            />
            <p className="text-[11px] text-ink-5 inline-flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" strokeWidth={1.75} />
              Se guarda cifrado con AES-256.
            </p>
          </div>

          <div className="space-y-2">
            <label className={labelCls} htmlFor="templateName">
              Nombre del template aprobado
            </label>
            <input
              id="templateName"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="abandoned_cart_recovery"
              disabled={!planAllows}
              className={inputCls}
            />
            <p className="text-[11px] text-ink-5">
              El template tiene que estar aprobado por WhatsApp en tu Business
              Manager.
            </p>
          </div>

          <div className="space-y-2">
            <label className={labelCls} htmlFor="templateLanguage">
              Idioma del template
            </label>
            <input
              id="templateLanguage"
              value={templateLanguage}
              onChange={(e) => setTemplateLanguage(e.target.value)}
              placeholder="es_AR"
              disabled={!planAllows}
              className={inputCls}
            />
            <p className="text-[11px] text-ink-5">
              Código ISO que usaste al aprobar el template (ej:{" "}
              <code className="font-mono">es_AR</code>,{" "}
              <code className="font-mono">es</code>).
            </p>
          </div>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="flex items-start gap-2 text-[12px] font-medium text-[color:var(--signal-danger)]"
          >
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div
            role="status"
            className="flex items-start gap-2 text-[12px] font-medium text-[color:var(--signal-success)]"
          >
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            {successMsg}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <button type="submit" disabled={isPending || !planAllows} className={primaryBtn}>
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            )}
            Guardar configuración
          </button>
          {settings.configured && (
            <button
              type="button"
              onClick={onDisconnect}
              disabled={isPending || !planAllows}
              className={secondaryBtn}
            >
              <Unplug className="h-3.5 w-3.5" strokeWidth={1.75} />
              Desconectar
            </button>
          )}
        </div>
      </form>

      {/* Info */}
      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-5 text-[12px] leading-[1.55] text-ink-5">
        <p className="font-medium text-ink-0 mb-1">Cómo se envía</p>
        <p>
          El cron de recuperación de carritos (cada 15–30 min) recorre los
          carritos inactivos con teléfono capturado en el checkout. Si la app
          está <strong className="text-ink-0">activa</strong>, las credenciales
          están completas y el teléfono es routable (AR), Nexora envía un solo
          mensaje de plantilla por carrito. Si falta algo, la app degrada en
          silencio y el email sigue saliendo como antes.
        </p>
      </div>
    </div>
  );
}
