"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { NexoraLogo } from "@/components/admin/layout/NexoraLogo";

interface AuthShellProps {
  step: string;
  eyebrow: string;
  brandTitle: ReactNode;
  brandBody: string;
  brandPoints?: readonly string[];
  formTitle: string;
  formSubtitle: string;
  children: ReactNode;
  alternateLabel: string;
  alternateAction: string;
  alternateHref: string;
}

export function AuthShell({
  step,
  eyebrow,
  formTitle,
  formSubtitle,
  children,
  alternateLabel,
  alternateAction,
  alternateHref,
}: AuthShellProps) {
  return (
    <main className="flex min-h-screen flex-col items-center bg-white px-5 py-10 text-ink-0">
      <div className="flex w-full max-w-[520px] flex-1 flex-col items-center justify-center">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2.5 text-[15px] font-semibold tracking-[-0.02em] text-ink-0"
          aria-label="Volver a Nexora"
        >
          <NexoraLogo className="h-8 w-8" />
          <span>nexora</span>
        </Link>

        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-6">
          {step} / {eyebrow}
        </span>

        <h1 className="mt-5 text-center text-[34px] font-semibold leading-[1.05] tracking-[-0.035em] text-ink-0 sm:text-[42px]">
          {formTitle}
        </h1>
        <p className="mt-3 max-w-[430px] text-center text-[15px] leading-[1.55] text-ink-5">
          {formSubtitle}
        </p>

        <section className="mt-8 w-full rounded-[24px] border border-[color:var(--hairline)] bg-white p-6 shadow-[0_18px_60px_-44px_rgba(15,23,42,0.55)] sm:p-7">
          <div>{children}</div>

          <p className="mt-6 text-center text-[13px] text-ink-5">
            {alternateLabel}{" "}
            <Link
              href={alternateHref}
              className="font-medium text-ink-0 underline decoration-[color:var(--hairline-strong)] underline-offset-4 transition-colors hover:decoration-ink-0"
            >
              {alternateAction}
            </Link>
          </p>
        </section>

        <div className="mt-7 flex flex-col items-center gap-5 text-center">
          <button
            type="button"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-[color:var(--hairline-strong)] bg-white px-5 text-[13px] font-medium text-ink-0"
          >
            Argentina
            <span aria-hidden className="text-ink-6">v</span>
          </button>

          <p className="max-w-[430px] text-[11.5px] leading-[1.6] text-ink-5">
            Al continuar, aceptas los Terminos y la Politica de privacidad de Nexora.
          </p>
        </div>
      </div>
    </main>
  );
}
