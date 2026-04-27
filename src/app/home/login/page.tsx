"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle, Mail } from "lucide-react";
import { Surface } from "@/components/ui/primitives";
import { PageReveal } from "@/components/public/PublicMotion";
import { loginAction, resendVerificationAction } from "@/app/home/auth-actions";

const inputClass =
  "flex min-h-12 h-12 w-full rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-3.5 text-[15px] text-ink-0 placeholder:text-ink-6 " +
  "transition-[box-shadow,border-color] duration-[var(--dur-base)] ease-[var(--ease-out)] " +
  "focus:border-[color:var(--hairline-strong)] focus:outline-none focus:shadow-[var(--shadow-focus)]";

const labelClass = "mb-1.5 block text-[12px] font-medium text-ink-5";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, undefined);
  const [resendState, resendFormAction, isResending] = useActionState(
    resendVerificationAction,
    undefined,
  );

  const showVerificationBlock = state?.needsVerification && state?.userId;

  return (
    <section className="mx-auto flex min-h-[calc(100vh-145px)] max-w-7xl items-center justify-center px-4 py-16 sm:px-8 sm:py-24">
      <PageReveal className="w-full max-w-[420px]">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-6 h-px w-10 bg-[var(--accent-500)]" aria-hidden />
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-5">
            Acceso
          </p>
          <h1 className="mt-4 text-[32px] font-semibold leading-[1.06] tracking-[-0.035em] text-ink-0 sm:text-[36px]">
            Ingresa a tu cuenta.
          </h1>
          <p className="mt-3 text-[14px] leading-[1.6] text-ink-5">
            Acceso a la plataforma operativa Nexora.
          </p>
        </div>

        <Surface level={0} hairline radius="lg" className="p-6 shadow-[var(--shadow-soft)] sm:p-8">
          <form className="space-y-4" action={formAction}>
            {state?.error && !showVerificationBlock && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-1)] px-3.5 py-3 text-[13px] text-[color:var(--signal-danger)]"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
                <p>{state.error}</p>
              </div>
            )}

            {showVerificationBlock && (
              <div className="rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-1)] p-4">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-ink-4" strokeWidth={1.75} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-ink-0">
                      Tu email aun no fue verificado.
                    </p>
                    <p className="mt-1 text-[12px] leading-[1.55] text-ink-5">
                      Revisa tu bandeja de entrada y hace clic en el enlace de
                      verificacion que te enviamos.
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
                            ? "Reenviando..."
                            : "Reenviar correo de verificacion"}
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
                  Contrasena
                </label>
                <a href="#" className="text-[12px] text-ink-5 transition-colors hover:text-ink-0">
                  Olvidaste tu contrasena
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
              className="inline-flex h-12 min-h-12 w-full items-center justify-center rounded-full bg-ink-0 text-[14px] font-medium text-ink-12 transition-colors hover:bg-ink-2 active:translate-y-px disabled:cursor-not-allowed disabled:bg-ink-8 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
            >
              {isPending ? "Ingresando..." : "Iniciar sesion"}
            </button>
          </form>
        </Surface>

        <div className="mt-6 text-center text-[13px] text-ink-5">
          Todavia no tienes cuenta?{" "}
          <Link
            href="/home/register"
            className="font-medium text-ink-0 underline decoration-[color:var(--hairline-strong)] underline-offset-4 hover:decoration-ink-0"
          >
            Registrate
          </Link>
        </div>
      </PageReveal>
    </section>
  );
}
