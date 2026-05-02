"use client";

import { Suspense, useActionState, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, Check, X } from "lucide-react";

import { AuthShell } from "@/components/public/AuthShell";
import { registerAction, socialAuthAction } from "@/app/home/auth-actions";
import { validatePasswordPolicy } from "@/lib/auth/password-policy";
import {
  getSocialAuthErrorMessage,
  SocialAuthButtons,
} from "@/components/public/SocialAuthButtons";

const inputClass =
  "flex h-12 min-h-12 w-full rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-white px-3.5 text-[15px] text-ink-0 placeholder:text-ink-6 transition-[box-shadow,border-color] duration-[var(--dur-base)] ease-[var(--ease-out)] focus:border-[color:var(--hairline-strong)] focus:outline-none focus:shadow-[var(--shadow-focus)]";

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
              <Check className="h-3 w-3 shrink-0 text-[color:var(--signal-success)]" strokeWidth={2.5} />
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
  return (
    <Suspense fallback={<RegisterFallback />}>
      <RegisterContent />
    </Suspense>
  );
}

function RegisterContent() {
  const searchParams = useSearchParams();
  const [state, formAction, isPending] = useActionState(registerAction, undefined);
  const [socialState, socialFormAction, isSocialPending] = useActionState(
    socialAuthAction,
    undefined,
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");

  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const callbackError = getSocialAuthErrorMessage(searchParams.get("auth_error"));
  const visibleError = state?.error || socialState?.error || callbackError;

  return (
    <AuthShell
      step="02"
      eyebrow="Cuenta nueva"
      brandTitle={
        <>
          Empeza tu tienda
          <br />
          en minutos.
        </>
      }
      brandBody="Mercado Pago, dominio propio y catalogo real desde el primer dia. Sin tarjeta, sin compromiso anual."
      brandPoints={[
        "Storefront editable + checkout argentino listos para vender.",
        "150 a 3.000 creditos de IA por mes segun plan.",
        "14 dias gratis. Cancelas cuando quieras.",
      ]}
      formTitle="Crea tu cuenta."
      formSubtitle="Configura tu empresa o continua con una cuenta social verificada."
      alternateLabel="Ya tenes cuenta?"
      alternateAction="Ingresar"
      alternateHref="/home/login"
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

        <form className="space-y-4" action={formAction}>
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
              Correo electronico
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
            <PasswordChecklist password={password} email={email} companyName={companyName} />
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
            className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-[var(--r-md)] bg-ink-0 text-[14px] font-medium text-ink-12 transition-colors hover:bg-ink-2 active:translate-y-px disabled:cursor-not-allowed disabled:bg-ink-8 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
          >
            {isPending ? "Configurando cuenta..." : "Registrar empresa"}
            {!isPending && (
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.75} />
            )}
          </button>
        </form>

        <SocialAuthButtons action={socialFormAction} mode="register" pending={isSocialPending} />
      </div>
    </AuthShell>
  );
}

function RegisterFallback() {
  return (
    <AuthShell
      step="02"
      eyebrow="Cuenta nueva"
      brandTitle={
        <>
          Empeza tu tienda
          <br />
          en minutos.
        </>
      }
      brandBody="Configura tu empresa y entra a Nexora."
      formTitle="Crea tu cuenta."
      formSubtitle="Preparando el registro seguro..."
      alternateLabel="Ya tenes cuenta?"
      alternateAction="Ingresar"
      alternateHref="/home/login"
    >
      <div className="h-[420px] animate-pulse rounded-[var(--r-md)] bg-[var(--surface-1)]" />
    </AuthShell>
  );
}
