"use client";

import Link from "next/link";
import { Mail } from "lucide-react";

// ─── Check Email ───
// Post-registration waiting state. Unified shell: monochrome hairline card,
// token-based icon frame, rect CTA. No emerald halo.

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2">
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

export default function CheckEmailPage() {
  return (
    <div className="min-h-screen bg-[var(--surface-1)] flex flex-col">
      <header className="border-b border-[color:var(--hairline)]">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-5 sm:px-8">
          <Wordmark />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:py-20">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-7 inline-flex h-12 w-12 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] text-ink-4">
            <Mail className="h-5 w-5" strokeWidth={1.75} />
          </div>

          <h1 className="font-semibold text-[28px] leading-[1.1] tracking-[-0.035em] text-ink-0">
            Revisá tu correo.
          </h1>
          <p className="mt-3 text-[14px] leading-[1.55] text-ink-5">
            Te enviamos un email de verificación con un enlace para activar tu
            cuenta.
          </p>
          <p className="mt-4 text-[12px] leading-[1.55] text-ink-6">
            Si no lo encontrás, revisá la carpeta de spam. El enlace expira en
            24 horas.
          </p>

          <div className="mt-10 border-t border-[color:var(--hairline)] pt-6 text-[13px] text-ink-5">
            ¿Ya verificaste?{" "}
            <Link
              href="/home/login"
              className="text-ink-0 font-medium underline decoration-[color:var(--hairline-strong)] underline-offset-4 hover:decoration-ink-0"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
