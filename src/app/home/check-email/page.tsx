"use client";

import { Mail } from "lucide-react";
import { AuthShell } from "@/components/public/AuthShell";

export default function CheckEmailPage() {
  return (
    <AuthShell
      step="03"
      eyebrow="Verificación"
      brandTitle={
        <>
          Te enviamos
          <br />
          el enlace.
        </>
      }
      brandBody="Confirmá tu correo para activar tu cuenta y entrar a la consola Nexora. El enlace expira en 24 horas."
      brandPoints={[
        "El correo llega desde notifications@nexora.io.",
        "Revisá la carpeta de spam si no lo encontrás.",
        "Si necesitás otro enlace, podés reenviarlo desde el login.",
      ]}
      formTitle="Revisá tu correo."
      formSubtitle="Te enviamos un email de verificación con un enlace para activar tu cuenta."
      alternateLabel="Ya verificaste?"
      alternateAction="Iniciar sesión"
      alternateHref="/home/login"
    >
      <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-paper)] p-7 sm:p-8">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[color:var(--hairline)] bg-[var(--surface-1)] text-ink-3">
          <Mail className="h-5 w-5" strokeWidth={1.75} />
        </span>

        <p className="mt-6 text-[14px] leading-[1.6] text-ink-5">
          Si no lo encontrás, revisá la carpeta de spam. El enlace expira en 24
          horas.
        </p>

        <ul className="mt-6 space-y-2.5 text-[12.5px] leading-[1.55] text-ink-4">
          <li className="flex items-start gap-2">
            <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-3" />
            <span>Asegurate de revisar la dirección que registraste.</span>
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-3" />
            <span>Hacé clic en "Confirmar mi correo" dentro del email.</span>
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-3" />
            <span>Después del clic, vuelvas acá y entrás con tu contraseña.</span>
          </li>
        </ul>
      </div>
    </AuthShell>
  );
}
