"use client";

import { useActionState, useState, useMemo } from "react";
import Link from "next/link";
import { Check, X, AlertCircle } from "lucide-react";
import { registerAction } from "@/app/home/auth-actions";
import { validatePasswordPolicy } from "@/lib/auth/password-policy";

// ─── Register ───
// Same handlers, server action and validation preserved. Rewritten shell to
// match the login page so new users enter a consistent monochrome flow.

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
    { label: "Una mayúscula", met: /[A-Z]/.test(password) },
    { label: "Una minúscula", met: /[a-z]/.test(password) },
    { label: "Un número", met: /[0-9]/.test(password) },
    { label: "Un símbolo", met: /[^A-Za-z0-9]/.test(password) },
  ];

  const contextErrors = result.errors.filter(
    (e) =>
      !e.includes("caracteres") &&
      !e.includes("mayúscula") &&
      !e.includes("minúscula") &&
      !e.includes("número") &&
      !e.includes("símbolo"),
  );

  return (
    <div className="mt-2.5 space-y-1.5">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {rules.map((r) => (
          <div key={r.label} className="flex items-center gap-1.5">
            {r.met ? (
              <Check
                className="h-3 w-3 shrink-0 text-[color:var(--signal-success)]"
                strokeWidth={2.5}
              />
            ) : (
              <X className="h-3 w-3 shrink-0 text-ink-7" strokeWidth={2} />
            )}
            <span
              className={`text-[11px] ${r.met ? "text-ink-0" : "text-ink-5"}`}
            >
              {r.label}
            </span>
          </div>
        ))}
      </div>
      {contextErrors.map((err, i) => (
        <p key={i} className="text-[11px] text-[color:var(--signal-danger)]">
          {err}
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
    <div className="min-h-screen bg-[var(--surface-1)] flex flex-col">
      <header className="border-b border-[color:var(--hairline)]">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-5 sm:px-8">
          <Wordmark />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="font-semibold text-[28px] leading-[1.1] tracking-[-0.035em] text-ink-0">
              Crear cuenta.
            </h1>
            <p className="mt-2 text-[14px] leading-[1.55] text-ink-5">
              Empezá a operar tu ecommerce en minutos.
            </p>
          </div>

          <form className="space-y-4" action={formAction}>
            {state?.error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-3.5 py-3 text-[13px] text-[color:var(--signal-danger)]"
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
                onChange={(e) => setCompanyName(e.target.value)}
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
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="password" className={labelClass}>
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                Confirmar contraseña
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={
                  inputClass +
                  (passwordMismatch
                    ? " border-[color:var(--signal-danger)] focus:border-[color:var(--signal-danger)]"
                    : "")
                }
              />
              {passwordMismatch && (
                <p className="mt-1.5 text-[11px] text-[color:var(--signal-danger)]">
                  Las contraseñas no coinciden.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex h-12 w-full items-center justify-center rounded-[var(--r-sm)] bg-ink-0 text-[14px] font-medium text-ink-12 transition-colors hover:bg-ink-2 active:translate-y-px disabled:bg-ink-8 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
            >
              {isPending ? "Configurando cuenta…" : "Registrar empresa"}
            </button>
          </form>

          <div className="mt-8 border-t border-[color:var(--hairline)] pt-6 text-center text-[13px] text-ink-5">
            ¿Ya tenés una cuenta?{" "}
            <Link
              href="/home/login"
              className="text-ink-0 font-medium underline decoration-[color:var(--hairline-strong)] underline-offset-4 hover:decoration-ink-0"
            >
              Ingresar
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
