"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { AlertCircle, Check, X } from "lucide-react";
import { Surface } from "@/components/ui/primitives";
import { PageReveal } from "@/components/public/PublicMotion";
import { registerAction } from "@/app/home/auth-actions";
import { validatePasswordPolicy } from "@/lib/auth/password-policy";

const inputClass =
  "flex h-11 w-full rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-3.5 text-[15px] text-ink-0 placeholder:text-ink-6 " +
  "transition-[box-shadow,border-color] duration-[var(--dur-base)] ease-[var(--ease-out)] " +
  "focus:border-[var(--accent-500)] focus:outline-none focus:shadow-[var(--shadow-focus)]";

const labelClass = "mb-1.5 block text-[12px] font-medium text-ink-5";

function PasswordChecklist({
  password,
  email,
  companyName,
}: {
  password: string;
  email: string;
  companyName: string;
}) {
  const result = useMemo(
    () => validatePasswordPolicy(password, { email, companyName }),
    [password, email, companyName],
  );

  if (!password) return null;

  const rules = [
    { label: "12+ caracteres", met: password.length >= 12 },
    { label: "Una mayuscula", met: /[A-Z]/.test(password) },
    { label: "Una minuscula", met: /[a-z]/.test(password) },
    { label: "Un numero", met: /[0-9]/.test(password) },
    { label: "Un simbolo", met: /[^A-Za-z0-9]/.test(password) },
  ];

  const contextErrors = result.errors.filter(
    (error) =>
      !error.includes("caracteres") &&
      !error.includes("mayuscula") &&
      !error.includes("minuscula") &&
      !error.includes("numero") &&
      !error.includes("simbolo"),
  );

  return (
    <div className="mt-2.5 space-y-1.5">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {rules.map((rule) => (
          <div key={rule.label} className="flex items-center gap-1.5">
            {rule.met ? (
              <Check
                className="h-3 w-3 shrink-0 text-[color:var(--signal-success)]"
                strokeWidth={2.5}
              />
            ) : (
              <X className="h-3 w-3 shrink-0 text-ink-7" strokeWidth={2} />
            )}
            <span className={`text-[11px] ${rule.met ? "text-ink-0" : "text-ink-5"}`}>
              {rule.label}
            </span>
          </div>
        ))}
      </div>
      {contextErrors.map((error, index) => (
        <p key={index} className="text-[11px] text-[color:var(--signal-danger)]">
          {error}
        </p>
      ))}
    </div>
  );
}

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(registerAction, undefined);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");

  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <section className="mx-auto flex min-h-[calc(100vh-145px)] max-w-7xl items-center justify-center px-4 py-14 sm:px-8 sm:py-20">
      <PageReveal className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-5">
            Crear cuenta
          </p>
          <h1 className="mt-4 text-[34px] font-semibold leading-[1.04] tracking-[-0.035em] text-ink-0">
            Empeza con una base mas ordenada.
          </h1>
          <p className="mt-3 text-[14px] leading-[1.6] text-ink-5">
            Configura tu empresa y entra a Nexora en pocos minutos.
          </p>
        </div>

        <Surface level={0} hairline radius="lg" className="p-5 sm:p-6">
          <form className="space-y-4" action={formAction}>
            {state?.error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-1)] px-3.5 py-3 text-[13px] text-[color:var(--signal-danger)]"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
                <p>{state.error}</p>
              </div>
            )}

            <div>
              <label htmlFor="name" className={labelClass}>
                Nombre de la empresa
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Ej: TechStore Argentina"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="email" className={labelClass}>
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="tu@empresa.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="password" className={labelClass}>
                Contrasena
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClass}
              />
              <PasswordChecklist
                password={password}
                email={email}
                companyName={companyName}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className={labelClass}>
                Confirmar contrasena
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className={
                  inputClass +
                  (passwordMismatch
                    ? " border-[color:var(--signal-danger)] focus:border-[color:var(--signal-danger)]"
                    : "")
                }
              />
              {passwordMismatch && (
                <p className="mt-1.5 text-[11px] text-[color:var(--signal-danger)]">
                  Las contrasenas no coinciden.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex h-12 w-full items-center justify-center rounded-[var(--r-sm)] bg-ink-0 text-[14px] font-medium text-ink-12 transition-colors hover:bg-ink-2 active:translate-y-px disabled:cursor-not-allowed disabled:bg-ink-8 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
            >
              {isPending ? "Configurando cuenta..." : "Registrar empresa"}
            </button>
          </form>
        </Surface>

        <div className="mt-6 text-center text-[13px] text-ink-5">
          Ya tienes una cuenta?{" "}
          <Link
            href="/home/login"
            className="font-medium text-ink-0 underline decoration-[color:var(--hairline-strong)] underline-offset-4 hover:decoration-ink-0"
          >
            Ingresar
          </Link>
        </div>
      </PageReveal>
    </section>
  );
}
