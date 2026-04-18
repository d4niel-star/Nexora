import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ShieldCheck,
  XCircle,
  type LucideIcon,
} from "lucide-react";

type PaymentStatus = "unknown" | "failure" | "pending" | "success";

interface ConfirmView {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  action: string;
  tone: "success" | "warning" | "danger";
  Icon: LucideIcon;
}

function getConfirmView(paymentStatus: string): ConfirmView {
  if (paymentStatus === "failure") {
    return {
      eyebrow: "Pago no procesado",
      title: "No pudimos completar el cobro",
      description:
        "El pago fue rechazado por Mercado Pago. No se realizó ningún cobro y podés intentar con otro método.",
      href: "/welcome/plan",
      action: "Reintentar con otro plan",
      tone: "danger",
      Icon: XCircle,
    };
  }

  if (paymentStatus === "pending") {
    return {
      eyebrow: "Verificando pago",
      title: "Estamos procesando tu pago",
      description:
        "Mercado Pago está verificando el método de pago. Tu suscripción se activará automáticamente cuando se confirme.",
      href: "/admin/dashboard",
      action: "Ir al dashboard",
      tone: "warning",
      Icon: Clock,
    };
  }

  if (paymentStatus === "unknown") {
    return {
      eyebrow: "Cuenta activa",
      title: "Todo listo para operar",
      description:
        "Tu plan y créditos iniciales fueron asignados. Ya podés entrar al panel y preparar tu tienda.",
      href: "/admin/dashboard",
      action: "Ir al dashboard",
      tone: "success",
      Icon: CheckCircle2,
    };
  }

  return {
    eyebrow: "Suscripción activa",
    title: "Pago confirmado",
    description:
      "Tu suscripción fue activada exitosamente. Los límites del plan y créditos IA ya están habilitados.",
    href: "/admin/dashboard",
    action: "Entrar al dashboard",
    tone: "success",
    Icon: CheckCircle2,
  };
}

function statusTone(tone: ConfirmView["tone"]) {
  if (tone === "danger") {
    return "text-[color:var(--signal-danger)] bg-[var(--surface-0)] border-[color:var(--hairline-strong)]";
  }
  if (tone === "warning") {
    return "text-[color:var(--signal-warning)] bg-[var(--surface-0)] border-[color:var(--hairline-strong)]";
  }
  return "text-[color:var(--signal-success)] bg-[var(--surface-0)] border-[color:var(--hairline-strong)]";
}

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: PaymentStatus; tx?: string }>;
}) {
  const params = await searchParams;
  const paymentStatus = params.payment || "unknown";
  const view = getConfirmView(paymentStatus);
  const Icon = view.Icon;

  return (
    <section className="mx-auto w-full max-w-4xl pt-2 sm:pt-8">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5 shadow-[var(--shadow-soft)] sm:p-8">
          <div className={`inline-flex items-center gap-2 rounded-[var(--r-full)] border px-3 py-1.5 text-[12px] font-medium ${statusTone(view.tone)}`}>
            <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
            {view.eyebrow}
          </div>

          <div className="mt-12 max-w-xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-6">
              Nexora checkout
            </p>
            <h1 className="mt-3 text-[40px] font-semibold leading-[0.98] tracking-[-0.035em] text-ink-0 sm:text-[58px]">
              {view.title}
            </h1>
            <p className="mt-5 text-[15px] leading-[1.65] text-ink-5">
              {view.description}
            </p>
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={view.href}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--r-sm)] bg-ink-0 px-6 text-[14px] font-medium text-ink-12 transition-colors hover:bg-ink-2"
            >
              {view.action}
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
            </Link>
            <div className="flex min-h-10 items-center gap-2 text-[12px] text-ink-5">
              <ShieldCheck className="h-4 w-4 text-ink-5" strokeWidth={1.75} />
              {paymentStatus === "unknown"
                ? "Acceso protegido por sesión segura."
                : "Mercado Pago mantiene protegida la transacción."}
            </div>
          </div>
        </div>

        <aside className="rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5 shadow-[var(--shadow-soft)] sm:p-6">
          <div className="flex items-center justify-between border-b border-[color:var(--hairline)] pb-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-6">
                Recibo
              </p>
              <p className="mt-1 text-[14px] font-semibold text-ink-0">Activación de cuenta</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--r-sm)] bg-[var(--surface-2)] text-ink-4">
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <StatusRow active label="Cuenta creada" description="Acceso habilitado." />
            <StatusRow
              active={paymentStatus !== "failure"}
              label="Plan asignado"
              description={paymentStatus === "failure" ? "Pendiente de pago válido." : "Límites configurados."}
            />
            <StatusRow
              active={paymentStatus === "success" || paymentStatus === "unknown"}
              pending={paymentStatus === "pending"}
              failed={paymentStatus === "failure"}
              label="Operación"
              description={
                paymentStatus === "pending"
                  ? "Se habilita al confirmarse el pago."
                  : paymentStatus === "failure"
                    ? "Requiere reintentar el pago."
                    : "Dashboard disponible."
              }
            />
          </div>

          {params.tx && (
            <div className="mt-6 border-t border-[color:var(--hairline)] pt-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-6">
                Referencia
              </p>
              <p className="mt-2 break-all font-mono text-[12px] text-ink-4">
                {params.tx}
              </p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function StatusRow({
  active,
  pending,
  failed,
  label,
  description,
}: {
  active: boolean;
  pending?: boolean;
  failed?: boolean;
  label: string;
  description: string;
}) {
  const Icon = failed ? AlertCircle : pending ? Clock : CheckCircle2;
  const color = failed
    ? "text-[color:var(--signal-danger)]"
    : pending
      ? "text-[color:var(--signal-warning)]"
      : active
        ? "text-[color:var(--signal-success)]"
        : "text-ink-5";

  return (
    <div className="flex gap-3">
      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--r-sm)] bg-[var(--surface-2)] ${color}`}>
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </div>
      <div>
        <p className="text-[13px] font-semibold text-ink-0">{label}</p>
        <p className="mt-1 text-[12px] leading-[1.5] text-ink-5">{description}</p>
      </div>
    </div>
  );
}
