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
        "El pago fue rechazado por Mercado Pago. No se realizo ningun cobro y podes intentar con otro metodo.",
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
        "Mercado Pago esta verificando el metodo de pago. Tu suscripcion se activara automaticamente cuando se confirme.",
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
        "Tu plan y creditos iniciales fueron asignados. Ya podes entrar al panel y preparar tu tienda.",
      href: "/admin/dashboard",
      action: "Ir al dashboard",
      tone: "success",
      Icon: CheckCircle2,
    };
  }

  return {
    eyebrow: "Suscripcion activa",
    title: "Pago confirmado",
    description:
      "Tu suscripcion fue activada exitosamente. Los limites del plan y creditos IA ya estan habilitados.",
    href: "/admin/dashboard",
    action: "Entrar al dashboard",
    tone: "success",
    Icon: CheckCircle2,
  };
}

function toneClasses(tone: ConfirmView["tone"]) {
  if (tone === "danger") {
    return {
      chip: "border-red-500/20 bg-red-500/10 text-red-200",
      icon: "border-red-400/25 bg-red-400/10 text-red-200",
      signal: "bg-red-400",
      button: "bg-ink-12 text-ink-0 hover:bg-ink-10",
    };
  }

  if (tone === "warning") {
    return {
      chip: "border-amber-400/25 bg-amber-400/10 text-amber-100",
      icon: "border-amber-400/25 bg-amber-400/10 text-amber-100",
      signal: "bg-amber-300",
      button: "bg-ink-12 text-ink-0 hover:bg-ink-10",
    };
  }

  return {
    chip: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
    icon: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
    signal: "bg-emerald-300",
    button: "bg-ink-12 text-ink-0 hover:bg-ink-10",
  };
}

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: PaymentStatus; tx?: string }>;
}) {
  const params = await searchParams;
  const paymentStatus = params.payment || "unknown";
  const view = getConfirmView(paymentStatus);
  const tone = toneClasses(view.tone);
  const Icon = view.Icon;

  return (
    <section className="mx-auto w-full max-w-5xl pt-4 sm:pt-10">
      <div className="relative overflow-hidden rounded-[var(--r-sm)] bg-ink-0 text-ink-12 shadow-[var(--shadow-elevated)]">
        <div
          aria-hidden
          className="absolute inset-0 opacity-45"
          style={{
            background:
              "radial-gradient(circle at 20% 10%, rgba(91,108,255,0.22), transparent 34%), linear-gradient(135deg, rgba(255,255,255,0.08), transparent 38%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />

        <div className="relative grid gap-8 p-5 sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:p-10">
          <div className="flex min-h-[440px] flex-col justify-between">
            <div>
              <span className={`inline-flex items-center gap-2 rounded-[var(--r-full)] border px-3 py-1.5 text-[12px] font-medium ${tone.chip}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${tone.signal}`} />
                {view.eyebrow}
              </span>

              <div className="mt-10 max-w-2xl">
                <div className={`mb-7 flex h-14 w-14 items-center justify-center rounded-[var(--r-sm)] border ${tone.icon}`}>
                  <Icon className="h-7 w-7" strokeWidth={1.75} />
                </div>
                <h1 className="font-semibold text-[42px] leading-[0.98] tracking-[-0.035em] text-ink-12 sm:text-[64px]">
                  {view.title}
                </h1>
                <p className="mt-6 max-w-xl text-[16px] leading-[1.6] text-ink-7">
                  {view.description}
                </p>
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                href={view.href}
                className={`inline-flex h-12 items-center justify-center gap-2 rounded-[var(--r-sm)] px-6 text-[14px] font-medium transition-colors ${tone.button}`}
              >
                {view.action}
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
              </Link>
              <div className="flex items-center gap-2 text-[12px] text-ink-7">
                <ShieldCheck className="h-4 w-4 text-ink-6" strokeWidth={1.75} />
                {paymentStatus === "unknown"
                  ? "Acceso protegido por sesion segura."
                  : "Mercado Pago mantiene protegida la transaccion."}
              </div>
            </div>
          </div>

          <aside className="rounded-[var(--r-sm)] border border-ink-12/10 bg-ink-12/[0.04] p-5 backdrop-blur-sm">
            <p className="text-eyebrow text-ink-6">Estado de activacion</p>
            <div className="mt-8 space-y-4">
              <StatusRow active label="Cuenta creada" description="Tu acceso a Nexora ya esta listo." />
              <StatusRow
                active={paymentStatus !== "failure"}
                label="Plan asignado"
                description={paymentStatus === "failure" ? "Pendiente hasta confirmar un pago valido." : "Limites y creditos configurados."}
              />
              <StatusRow
                active={paymentStatus === "success" || paymentStatus === "unknown"}
                pending={paymentStatus === "pending"}
                failed={paymentStatus === "failure"}
                label="Operacion habilitada"
                description={
                  paymentStatus === "pending"
                    ? "Se habilita automaticamente al confirmarse el pago."
                    : paymentStatus === "failure"
                      ? "Requiere un intento de pago aprobado."
                      : "Ya podes entrar al dashboard."
                }
              />
            </div>

            {params.tx && (
              <div className="mt-8 rounded-[var(--r-sm)] border border-ink-12/10 bg-ink-0/40 p-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-6">
                  Referencia
                </p>
                <p className="mt-2 break-all font-mono text-[12px] text-ink-8">
                  {params.tx}
                </p>
              </div>
            )}
          </aside>
        </div>
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
  const color = failed ? "text-red-200" : pending ? "text-amber-100" : active ? "text-emerald-100" : "text-ink-6";

  return (
    <div className="flex gap-3">
      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--r-sm)] border border-ink-12/10 bg-ink-12/[0.03] ${color}`}>
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </div>
      <div>
        <p className="text-[13px] font-semibold text-ink-12">{label}</p>
        <p className="mt-1 text-[12px] leading-[1.5] text-ink-7">{description}</p>
      </div>
    </div>
  );
}
