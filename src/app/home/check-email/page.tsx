"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { Surface } from "@/components/ui/primitives";
import { PageReveal } from "@/components/public/PublicMotion";

export default function CheckEmailPage() {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-145px)] max-w-7xl items-center justify-center px-4 py-16 sm:px-8 sm:py-24">
      <PageReveal className="w-full max-w-[420px] text-center">
        <div className="mx-auto mb-6 h-px w-10 bg-[var(--accent-500)]" aria-hidden />
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-5">
          Verificacion
        </p>
        <h1 className="mt-4 text-[32px] font-semibold leading-[1.06] tracking-[-0.035em] text-ink-0 sm:text-[36px]">
          Revisa tu correo.
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-[14px] leading-[1.6] text-ink-5">
          Te enviamos un email de verificacion con un enlace para activar tu cuenta.
        </p>

        <Surface level={0} hairline radius="lg" className="mt-10 p-7 shadow-[var(--shadow-soft)] sm:p-8">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] text-ink-4">
            <Mail className="h-5 w-5" strokeWidth={1.75} />
          </div>

          <p className="mt-5 text-[13px] leading-[1.6] text-ink-5">
            Si no lo encuentras, revisa la carpeta de spam. El enlace expira en 24 horas.
          </p>

          <div className="mt-6 border-t border-[color:var(--hairline)] pt-6 text-[13px] text-ink-5">
            Ya verificaste?{" "}
            <Link
              href="/home/login"
              className="font-medium text-ink-0 underline decoration-[color:var(--hairline-strong)] underline-offset-4 hover:decoration-ink-0"
            >
              Iniciar sesion
            </Link>
          </div>
        </Surface>
      </PageReveal>
    </section>
  );
}
