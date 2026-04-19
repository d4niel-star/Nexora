"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Surface } from "@/components/ui/primitives";
import { PageReveal } from "@/components/public/PublicMotion";

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
      description: "Tu direccion de correo fue confirmada. Ya puedes iniciar sesion.",
    },
    expired: {
      icon: (
        <Clock
          className="h-5 w-5 text-[color:var(--signal-warning)]"
          strokeWidth={1.75}
        />
      ),
      title: "El enlace expiro.",
      description: "Este enlace ya no es valido. Inicia sesion para solicitar uno nuevo.",
    },
    used: {
      icon: (
        <AlertTriangle
          className="h-5 w-5 text-[color:var(--signal-warning)]"
          strokeWidth={1.75}
        />
      ),
      title: "Enlace ya utilizado.",
      description: "Si tu email ya esta verificado, puedes iniciar sesion normalmente.",
    },
    invalid: {
      icon: (
        <XCircle
          className="h-5 w-5 text-[color:var(--signal-danger)]"
          strokeWidth={1.75}
        />
      ),
      title: "Enlace no valido.",
      description:
        "Verifica que estes usando el enlace completo del correo que recibiste.",
    },
  };

  const current = config[status];

  return (
    <section className="mx-auto flex min-h-[calc(100vh-145px)] max-w-7xl items-center justify-center px-4 py-16 sm:px-8 sm:py-24">
      <PageReveal className="w-full max-w-[420px] text-center">
        <div className="mx-auto mb-6 h-px w-10 bg-[var(--accent-500)]" aria-hidden />
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-5">
          Verificacion
        </p>
        <h1 className="mt-4 text-[32px] font-semibold leading-[1.06] tracking-[-0.035em] text-ink-0 sm:text-[36px]">
          {current.title}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-[14px] leading-[1.6] text-ink-5">
          {current.description}
        </p>

        <Surface level={0} hairline radius="lg" className="mt-10 p-7 shadow-[var(--shadow-soft)] sm:p-8">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
            {current.icon}
          </div>

          <Link
            href="/home/login"
            className="mt-6 inline-flex h-12 min-h-12 w-full items-center justify-center rounded-[var(--r-md)] bg-ink-0 text-[14px] font-medium text-ink-12 transition-colors hover:bg-ink-2 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
          >
            Ir al inicio de sesion
          </Link>
        </Surface>
      </PageReveal>
    </section>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-145px)] items-center justify-center px-4 text-[13px] text-ink-5">
          Cargando...
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
