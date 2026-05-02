"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, Mail } from "lucide-react";

import { AuthShell } from "@/components/public/AuthShell";
import {
  loginAction,
  resendVerificationAction,
  socialAuthAction,
} from "@/app/home/auth-actions";
import {
  getSocialAuthErrorMessage,
  SocialAuthButtons,
} from "@/components/public/SocialAuthButtons";

const inputClass =
  "flex h-12 min-h-12 w-full rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-white px-3.5 text-[15px] text-ink-0 placeholder:text-ink-6 transition-[box-shadow,border-color] duration-[var(--dur-base)] ease-[var(--ease-out)] focus:border-[color:var(--hairline-strong)] focus:outline-none focus:shadow-[var(--shadow-focus)]";

const labelClass = "mb-1.5 block text-[12px] font-medium text-ink-5";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const [state, formAction, isPending] = useActionState(loginAction, undefined);
  const [resendState, resendFormAction, isResending] = useActionState(
    resendVerificationAction,
    undefined,
  );
  const [socialState, socialFormAction, isSocialPending] = useActionState(
    socialAuthAction,
    undefined,
  );

  const showVerificationBlock = state?.needsVerification && state?.userId;
  const callbackError = getSocialAuthErrorMessage(searchParams.get("auth_error"));
  const visibleError =
    socialState?.error || callbackError || (!showVerificationBlock ? state?.error : undefined);

  return (
    <AuthShell
      step="01"
      eyebrow="Acceso"
      brandTitle={
        <>
          Tu tienda,
          <br />
          en una sola pantalla.
        </>
      }
      brandBody="Ingresa a la consola Nexora. Catalogo, ventas, pagos, envios y crecimiento en el mismo lugar, sobre tus datos reales."
      brandPoints={[
        "Pedidos, stock y pagos sincronizados en tiempo real.",
        "Mercado Pago, Andreani y Correo Argentino integrados.",
        "Tienda IA proponiendo acciones todos los dias.",
      ]}
      formTitle="Inicia sesion en Nexora."
      formSubtitle="Un acceso claro, blanco y seguro para tu consola."
      alternateLabel="Todavia no tenes cuenta?"
      alternateAction="Registrate"
      alternateHref="/home/register"
    >
      <div className="space-y-4">
        {visibleError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-[var(--r-md)] border border-[color:var(--signal-danger)]/30 bg-[color:var(--signal-danger)]/5 px-3.5 py-3 text-[13px] text-[color:var(--signal-danger)]"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
            <p>{visibleError}</p>
          </div>
        )}

        {showVerificationBlock && (
          <div className="rounded-[var(--r-md)] border border-[color:var(--hairline-strong)] bg-white p-4">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-ink-4" strokeWidth={1.75} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-ink-0">
                  Tu email aun no fue verificado.
                </p>
                <p className="mt-1 text-[12px] leading-[1.55] text-ink-5">
                  Revisa tu bandeja de entrada y hace clic en el enlace de verificacion.
                </p>
                {resendState?.success ? (
                  <p className="mt-3 text-[12px] font-medium text-[color:var(--signal-success)]">
                    Correo reenviado correctamente.
                  </p>
                ) : (
                  <form action={resendFormAction} className="mt-3">
                    <input type="hidden" name="userId" value={state.userId} />
                    <button
                      type="submit"
                      disabled={isResending}
                      className="text-[12px] font-medium text-ink-0 underline decoration-[color:var(--hairline-strong)] underline-offset-4 transition-colors hover:decoration-ink-0 disabled:opacity-50"
                    >
                      {isResending ? "Reenviando..." : "Reenviar correo de verificacion"}
                    </button>
                  </form>
                )}
                {resendState?.error && (
                  <p className="mt-2 text-[12px] text-[color:var(--signal-danger)]">
                    {resendState.error}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <form className="space-y-4" action={formAction}>
          <div>
            <label htmlFor="email" className={labelClass}>
              Correo electronico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="tu@empresa.com"
              required
              className={inputClass}
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="text-[12px] font-medium text-ink-5">
                Contrasena
              </label>
              <a
                href="#"
                className="text-[12px] text-ink-5 transition-colors hover:text-ink-0"
              >
                Olvidaste tu contrasena?
              </a>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-[var(--r-md)] bg-ink-0 text-[14px] font-medium text-ink-12 transition-colors hover:bg-ink-2 active:translate-y-px disabled:cursor-not-allowed disabled:bg-ink-8 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
          >
            {isPending ? "Ingresando..." : "Iniciar sesion"}
            {!isPending && (
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                strokeWidth={1.75}
              />
            )}
          </button>
        </form>

        <SocialAuthButtons action={socialFormAction} mode="login" pending={isSocialPending} />
      </div>
    </AuthShell>
  );
}

function LoginFallback() {
  return (
    <AuthShell
      step="01"
      eyebrow="Acceso"
      brandTitle={
        <>
          Tu tienda,
          <br />
          en una sola pantalla.
        </>
      }
      brandBody="Ingresa a la consola Nexora."
      formTitle="Inicia sesion en Nexora."
      formSubtitle="Preparando el acceso seguro..."
      alternateLabel="Todavia no tenes cuenta?"
      alternateAction="Registrate"
      alternateHref="/home/register"
    >
      <div className="h-[248px] animate-pulse rounded-[var(--r-md)] bg-[var(--surface-1)]" />
    </AuthShell>
  );
}
