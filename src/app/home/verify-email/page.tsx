"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";

// ─── Verify Email ───
// Four possible post-verification states. All share the same monochrome
// shell with a tokenized icon frame. Icon tint is the only color variation
// (success / warning / danger) — everything else stays neutral.

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

type StatusKey = "success" | "expired" | "used" | "invalid";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const status = (searchParams.get("status") as StatusKey) || "invalid";

  const config: Record<
    StatusKey,
    {
      icon: React.ReactNode;
      title: string;
      description: string;
      showLogin: boolean;
    }
  > = {
    success: {
      icon: (
        <CheckCircle2
          className="h-5 w-5 text-[color:var(--signal-success)]"
          strokeWidth={1.75}
        />
      ),
      title: "Email verificado.",
      description:
        "Tu dirección de correo fue confirmada. Ya podés iniciar sesión.",
      showLogin: true,
    },
    expired: {
      icon: (
        <Clock
          className="h-5 w-5 text-[color:var(--signal-warning)]"
          strokeWidth={1.75}
        />
      ),
      title: "El enlace expiró.",
      description:
        "Este enlace de verificación ya no es válido. Iniciá sesión para solicitar uno nuevo.",
      showLogin: true,
    },
    used: {
      icon: (
        <AlertTriangle
          className="h-5 w-5 text-[color:var(--signal-warning)]"
          strokeWidth={1.75}
        />
      ),
      title: "Enlace ya utilizado.",
      description:
        "Este enlace ya fue consumido. Si tu email ya está verificado, podés iniciar sesión normalmente.",
      showLogin: true,
    },
    invalid: {
      icon: (
        <XCircle
          className="h-5 w-5 text-[color:var(--signal-danger)]"
          strokeWidth={1.75}
        />
      ),
      title: "Enlace no válido.",
      description:
        "El enlace de verificación no es correcto. Verificá que estés usando el enlace completo del correo que recibiste.",
      showLogin: true,
    },
  };

  const current = config[status];

  return (
    <div className="min-h-screen bg-[var(--surface-1)] flex flex-col">
      <header className="border-b border-[color:var(--hairline)]">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-5 sm:px-8">
          <Wordmark />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:py-20">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-7 inline-flex h-12 w-12 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)]">
            {current.icon}
          </div>

          <h1 className="font-semibold text-[28px] leading-[1.1] tracking-[-0.035em] text-ink-0">
            {current.title}
          </h1>
          <p className="mt-3 text-[14px] leading-[1.55] text-ink-5">
            {current.description}
          </p>

          {current.showLogin && (
            <Link
              href="/home/login"
              className="mt-10 inline-flex h-12 w-full items-center justify-center rounded-[var(--r-sm)] bg-ink-0 text-[14px] font-medium text-ink-12 transition-colors hover:bg-ink-2"
            >
              Ir al inicio de sesión
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--surface-1)] text-[13px] text-ink-5">
          Cargando…
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
