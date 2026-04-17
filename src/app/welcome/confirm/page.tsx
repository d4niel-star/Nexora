import Link from "next/link";
import {
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  Clock,
  XCircle,
  Shield,
} from "lucide-react";

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string; tx?: string }>;
}) {
  const params = await searchParams;
  const paymentStatus = params.payment || "unknown";

  // ─── Plan confirmation (no payment param) ───
  if (paymentStatus === "unknown") {
    return (
      <div className="max-w-lg mx-auto text-center space-y-8 animate-in fade-in zoom-in-95 duration-700 pt-12 sm:pt-20">
        <div className="relative mx-auto w-20 h-20">
          <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
          <div className="relative w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/30">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-emerald-600 text-[13px] font-semibold uppercase tracking-[0.15em]">
            Cuenta activa
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#111111]">
            Todo listo para empezar
          </h1>
          <p className="text-[#888888] text-[15px] leading-relaxed max-w-sm mx-auto">
            Tu plan y créditos iniciales fueron asignados.
            Ya podés acceder al panel y comenzar a operar.
          </p>
        </div>

        <div className="pt-4">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-8 py-4 rounded-xl text-[15px] font-semibold bg-[#111111] text-white hover:bg-[#222222] transition-all duration-200 shadow-lg shadow-black/10"
          >
            Ir al Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // ─── Payment failure ───
  if (paymentStatus === "failure") {
    return (
      <div className="max-w-lg mx-auto text-center space-y-8 animate-in fade-in zoom-in-95 duration-700 pt-12 sm:pt-20">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
          <XCircle className="w-10 h-10 text-red-500" />
        </div>

        <div className="space-y-3">
          <p className="text-red-500 text-[13px] font-semibold uppercase tracking-[0.15em]">
            Pago no procesado
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#111111]">
            No pudimos completar el cobro
          </h1>
          <p className="text-[#888888] text-[15px] leading-relaxed max-w-sm mx-auto">
            El pago fue rechazado por Mercado Pago. No se realizó ningún cobro.
            Podés intentar con otro método de pago.
          </p>
        </div>

        <div className="pt-4">
          <Link
            href="/welcome/plan"
            className="inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-8 py-4 rounded-xl text-[15px] font-semibold bg-white text-[#09090B] hover:bg-[#F4F4F5] transition-all duration-200 shadow-lg shadow-white/5"
          >
            Reintentar con otro plan
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // ─── Payment pending ───
  if (paymentStatus === "pending") {
    return (
      <div className="max-w-lg mx-auto text-center space-y-8 animate-in fade-in zoom-in-95 duration-700 pt-12 sm:pt-20">
        <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto border border-amber-500/20">
          <Clock className="w-10 h-10 text-amber-500" />
        </div>

        <div className="space-y-3">
          <p className="text-amber-500 text-[13px] font-semibold uppercase tracking-[0.15em]">
            Verificando pago
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#111111]">
            Estamos procesando tu pago
          </h1>
          <p className="text-[#888888] text-[15px] leading-relaxed max-w-sm mx-auto">
            Mercado Pago está verificando el método de pago. Tu suscripción se activará automáticamente
            una vez confirmada.
          </p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-8 py-4 rounded-xl text-[15px] font-semibold bg-[#F5F5F5] text-[#111111] border border-[#EAEAEA] hover:bg-[#EAEAEA] hover:border-[#CCCCCC] transition-all duration-200"
          >
            Ir al Dashboard
            <ArrowRight className="w-4 h-4 opacity-50" />
          </Link>
        </div>
      </div>
    );
  }

  // ─── Payment success ───
  return (
    <div className="max-w-lg mx-auto text-center space-y-8 animate-in fade-in zoom-in-95 duration-700 pt-12 sm:pt-20">
      <div className="relative mx-auto w-20 h-20">
        <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
        <div className="relative w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/30">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-emerald-600 text-[13px] font-semibold uppercase tracking-[0.15em]">
          Suscripción activa
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#111111]">
          ¡Pago confirmado!
        </h1>
        <p className="text-[#888888] text-[15px] leading-relaxed max-w-sm mx-auto">
          Tu suscripción fue activada exitosamente. Todos los límites de tu plan y créditos IA
          ya están habilitados en tu cuenta.
        </p>
      </div>

      <div className="pt-4">
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-8 py-4 rounded-xl text-[15px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-200"
        >
          Entrar al Dashboard
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#999999] font-medium">
        <Shield className="w-3.5 h-3.5 text-emerald-500" />
        Transacción protegida por Mercado Pago
      </div>
    </div>
  );
}
