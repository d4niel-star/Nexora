"use client";

import { useActionState } from "react";
import { AlertCircle, ArrowRight, Mail } from "lucide-react";
import { AuthShell } from "@/components/public/AuthShell";
import { loginAction, resendVerificationAction } from "@/app/home/auth-actions";

const inputClass =
  "flex h-12 min-h-12 w-full rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-paper)] px-3.5 text-[15px] text-ink-0 placeholder:text-ink-6 transition-[box-shadow,border-color] duration-[var(--dur-base)] ease-[var(--ease-out)] focus:border-[color:var(--hairline-strong)] focus:outline-none focus:shadow-[var(--shadow-focus)]";

const labelClass = "mb-1.5 block text-[12px] font-medium text-ink-5";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, undefined);
  const [resendState, resendFormAction, isResending] = useActionState(
    resendVerificationAction,
    undefined,
  );

  const showVerificationBlock = state?.needsVerification && state?.userId;

  return (
    <AuthShell
      step="01"
      eyebrow="Acceso"
      brandTitle={
        <>
          Tu operación
          <br />
          en una sola base.
        </>
      }
      brandBody="Ingresá a la consola Nexora. Catálogo, ventas, ads, logística y proveedores en la misma pantalla, leyendo el mismo dato real."
      brandPoints={[
        "Sin pegamento entre apps. Sin verdades paralelas.",
        "Total calculado en servidor. Stock confirmado antes del cobro.",
        "Sesión cifrada · multi-tienda en planes Scale.",
      ]}
      formTitle="Ingresá a tu cuenta."
      formSubtitle="Acceso a la plataforma operativa Nexora."
      alternateLabel="Todavía no tenés cuenta?"
      alternateAction="Registrate"
      alternateHref="/home/register"
    >
      <form className="space-y-4" action={formAction}>
        {state?.error && !showVerificationBlock && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-[var(--r-md)] border border-[color:var(--signal-danger)]/30 bg-[color:var(--signal-danger)]/5 px-3.5 py-3 text-[13px] text-[color:var(--signal-danger)]"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
            <p>{state.error}</p>
          </div>
        )}

        {showVerificationBlock && (
          <div className="rounded-[var(--r-md)] border border-[color:var(--hairline-strong)] bg-[var(--surface-paper)] p-4">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-ink-4" strokeWidth={1.75} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-ink-0">
                  Tu email aún no fue verificado.
                </p>
                <p className="mt-1 text-[12px] leading-[1.55] text-ink-5">
                  Revisá tu bandeja de entrada y hacé clic en el enlace de
                  verificación que te enviamos.
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
                      {isResending ? "Reenviando..." : "Reenviar correo de verificación"}
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

        <div>
          <label htmlFor="email" className={labelClass}>
            Email
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
              Contraseña
            </label>
            <a
              href="#"
              className="text-[12px] text-ink-5 transition-colors hover:text-ink-0"
            >
              Olvidaste tu contraseña?
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
          className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink-0 text-[14px] font-medium text-ink-12 transition-colors hover:bg-ink-2 active:translate-y-px disabled:cursor-not-allowed disabled:bg-ink-8 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
        >
          {isPending ? "Ingresando..." : "Iniciar sesión"}
          {!isPending && (
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              strokeWidth={1.75}
            />
          )}
        </button>
      </form>
    </AuthShell>
  );
}
