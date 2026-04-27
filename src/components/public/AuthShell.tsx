"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { NexoraLogo } from "@/components/admin/layout/NexoraLogo";

// ─── AuthShell ────────────────────────────────────────────────────────────
// Split-shell layout that owns the entire auth surface (login, register,
// check-email, verify). The previous auth pages rendered a centered 420px
// card on a flat background — boring and indistinguishable from any
// other SaaS. The new shell pairs:
//
//   · Left:  navy manifesto panel with grid backdrop + radial glow,
//            a numbered eyebrow ("01 / Acceso", etc.), a short
//            architectural pitch and a footer with operational chips.
//   · Right: paper form panel with a tight max-width, the route's actual
//            form children, and a header / footer for sister-route
//            cross-links.
//
// The split-shell, canvas-grid-on-dark and form-panel surfaces are all
// expressed as utilities in globals.css so the home → auth → admin
// transition reads as one continuous brand surface.

interface AuthShellProps {
  // Numeric anchor — "01 / Acceso", "02 / Cuenta nueva", etc.
  step: string;
  // Top label (eyebrow)
  eyebrow: string;
  // Manifesto title shown on the navy panel
  brandTitle: ReactNode;
  // Manifesto body shown beneath the brand title
  brandBody: string;
  // Optional list of bullet points anchoring the manifesto
  brandPoints?: readonly string[];
  // Right-panel page title and subtitle
  formTitle: string;
  formSubtitle: string;
  // Right-panel form content
  children: ReactNode;
  // Cross-link rendered at the bottom of the form panel
  alternateLabel: string;
  alternateAction: string;
  alternateHref: string;
}

export function AuthShell({
  step,
  eyebrow,
  brandTitle,
  brandBody,
  brandPoints,
  formTitle,
  formSubtitle,
  children,
  alternateLabel,
  alternateAction,
  alternateHref,
}: AuthShellProps) {
  return (
    <div className="split-shell">
      {/* ── Brand panel (navy) ── */}
      <aside className="split-shell-brand">
        <div className="relative z-10 flex flex-col gap-12">
          <div className="flex items-center gap-2.5">
            <NexoraLogo className="h-[22px] w-[22px]" dark />
            <span className="text-[17px] font-semibold leading-none tracking-[-0.03em] text-white">
              nexora
            </span>
          </div>

          <div>
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--chrome-fg-muted)]">
              <span aria-hidden className="h-px w-4 bg-[color:var(--chrome-fg-muted)]" />
              {step}
              <span aria-hidden className="h-px w-4 bg-[color:var(--chrome-fg-muted)]" />
              {eyebrow}
            </span>
            <h1 className="mt-6 max-w-[16ch] text-[36px] font-semibold leading-[1.04] tracking-[-0.04em] text-white sm:text-[48px]">
              {brandTitle}
            </h1>
            <p className="mt-6 max-w-md text-[15px] leading-[1.65] text-[var(--chrome-fg-muted)]">
              {brandBody}
            </p>
          </div>

          {brandPoints && brandPoints.length > 0 && (
            <ul className="space-y-3">
              {brandPoints.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-[13.5px] leading-[1.55] text-[var(--chrome-fg)]">
                  <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-white/45" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer: integration mention only. The old "Sistema operativo ·
            ecommerce 2027" eyebrow tagline was removed — it read as a
            manifesto and pushed the brand into editorial territory the
            marketing v3 explicitly walks away from. */}
        <div className="relative z-10 mt-12 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[color:var(--chrome-border)] pt-6 text-[11px] text-[var(--chrome-fg-muted)]">
          <span className="font-medium">
            Mercado Pago · Andreani · Correo Argentino · Meta · TikTok · Google
          </span>
        </div>
      </aside>

      {/* ── Form panel (paper) ── */}
      <main className="split-shell-form">
        <div className="w-full max-w-[440px]">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-5 transition-colors hover:text-ink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
            Volver al inicio
          </Link>

          <div className="mt-8">
            <h2 className="text-[28px] font-semibold leading-[1.06] tracking-[-0.03em] text-ink-0 sm:text-[32px]">
              {formTitle}
            </h2>
            <p className="mt-2 text-[14px] leading-[1.55] text-ink-5">
              {formSubtitle}
            </p>
          </div>

          <div className="mt-10">
            {children}
          </div>

          <p className="mt-10 text-[13px] text-ink-5">
            {alternateLabel}{" "}
            <Link
              href={alternateHref}
              className="font-medium text-ink-0 underline decoration-[color:var(--hairline-strong)] underline-offset-4 transition-colors hover:decoration-ink-0"
            >
              {alternateAction}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
