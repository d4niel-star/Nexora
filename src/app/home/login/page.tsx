"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Mail, AlertCircle } from "lucide-react";
import { loginAction, resendVerificationAction } from "@/app/home/auth-actions";

// ─── Login ───
// Logic, server actions and state machine preserved byte-for-byte. Visual
// rewrite only: monochrome surface, hairline card, token inputs, rect CTA.

function Wordmark() {
  return (
    <Link href="/home" className="flex items-center gap-2">
      <span className="relative inline-flex items-center justify-center">
        <span className="block h-3 w-3 rounded-[2px] bg-ink-0 translate-x-[2px] translate-y-[2px]" />
        <span className="absolute h-3 w-3 rounded-[2px] bg-[var(--accent-500)] -translate-x-[2px] -translate-y-[2px]" />
      </span>
      <span className="font-semibold text-[15px] leading-none tracking-[-0.03em] text-ink-0">
        nexora
      </span>
    </Link>
  );
}

const inputClass =
  "flex h-11 w-full rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-3.5 text-[15px] text-ink-0 placeholder:text-ink-6 " +
  "transition-[box-shadow,border-color] duration-[var(--dur-base)] ease-[var(--ease-out)] " +
  "focus:border-[var(--accent-500)] focus:outline-none focus:shadow-[var(--shadow-focus)]";

const labelClass = "block text-[12px] font-medium text-ink-5 mb-1.5";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, undefined);
  const [resendState, resendFormAction, isResending] = useActionState(
    resendVerificationAction,
    undefined,
  );

  const showVerificationBlock = state?.needsVerification && state?.userId;

  return (
    <div className="min-h-screen bg-[var(--surface-1)] flex flex-col">
      <header className="border-b border-[color:var(--hairline)]">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-5 sm:px-8">
          <Wordmark />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:py-20">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="font-semibold text-[28px] leading-[1.1] tracking-[-0.035em] text-ink-0">
              Ingresá a tu cuenta.
            </h1>
            <p className="mt-2 text-[14px] leading-[1.55] text-ink-5">
              Acceso a la plataforma operativa Nexora.
            </p>
          </div>

          <form className="space-y-4" action={formAction}>
            {state?.error && !showVerificationBlock && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-3.5 py-3 text-[13px] text-[color:var(--signal-danger)]"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
                <p>{state.error}</p>
              </div>
            )}

            {showVerificationBlock && (
              <div className="rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] p-4">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-ink-4" strokeWidth={1.75} />
                  <div className="flex-1 min-w-0">
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
                          className="text-[12px] font-medium text-ink-0 underline decoration-[color:var(--hairline-strong)] underline-offset-4 hover:decoration-ink-0 disabled:opacity-50"
                        >
                          {isResending
                            ? "Reenviando…"
                            : "Reenviar correo de verificación"}
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
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text-[12px] font-medium text-ink-5">
                  Contraseña
                </label>
                <a
                  href="#"
                  className="text-[12px] text-ink-5 transition-colors hover:text-ink-0"
                >
                  ¿Olvidaste tu contraseña?
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
              className="inline-flex h-12 w-full items-center justify-center rounded-[var(--r-sm)] bg-ink-0 text-[14px] font-medium text-ink-12 transition-colors hover:bg-ink-2 active:translate-y-px disabled:bg-ink-8 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
            >
              {isPending ? "Ingresando…" : "Iniciar sesión"}
            </button>
          </form>

          <div className="mt-8 border-t border-[color:var(--hairline)] pt-6 text-center text-[13px] text-ink-5">
            ¿Todavía no tenés cuenta?{" "}
            <Link
              href="/home/register"
              className="text-ink-0 font-medium underline decoration-[color:var(--hairline-strong)] underline-offset-4 hover:decoration-ink-0"
            >
              Registrate
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
