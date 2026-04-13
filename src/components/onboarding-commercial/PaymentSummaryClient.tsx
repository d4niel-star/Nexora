"use client";

import { useState } from "react";
import { checkoutPaidPlanAction } from "@/lib/onboarding-commercial/actions";
import {
  AlertCircle,
  CreditCard,
  ChevronLeft,
  Shield,
  ArrowRight,
  Loader2,
  Zap,
  Package,
  ShoppingCart,
  Globe,
  Users,
  Check,
} from "lucide-react";
import { useRouter } from "next/navigation";

export function PaymentSummaryClient({ planInfo }: { planInfo: any }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleCheckout = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await checkoutPaidPlanAction(planInfo.code);
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
      } else {
        setError("No se pudo generar el enlace de pago.");
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "Ocurrió un error al procesar el pago");
      setLoading(false);
    }
  };

  const formatPrice = (v: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(v);

  const summaryLines = [
    {
      label: "Créditos IA",
      value: planInfo.config.aiCredits.toLocaleString(),
      icon: Zap,
    },
    {
      label: "Productos",
      value: planInfo.config.maxProducts === 0 ? "Ilimitados" : planInfo.config.maxProducts.toString(),
      icon: Package,
    },
    {
      label: "Ventas / mes",
      value: planInfo.config.maxOrdersPerMonth === 0 ? "Ilimitadas" : planInfo.config.maxOrdersPerMonth.toString(),
      icon: ShoppingCart,
    },
    {
      label: "Dominio propio",
      value: planInfo.config.customDomain ? "Incluido" : "No incluido",
      icon: Globe,
    },
    {
      label: "Usuarios",
      value: planInfo.config.maxStaff.toString(),
      icon: Users,
    },
  ];

  return (
    <div className="max-w-xl mx-auto space-y-8 animate-in fade-in duration-700 pt-4 sm:pt-8">
      {/* Back */}
      <button
        onClick={() => router.push("/welcome/plan")}
        className="flex items-center gap-2 text-[13px] font-medium text-[#888888] hover:text-[#111111] transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Volver a los planes
      </button>

      {/* Header */}
      <div>
        <p className="text-emerald-600 text-[13px] font-semibold uppercase tracking-[0.15em] mb-3">
          Activar suscripción
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#111111]">
          Resumen de tu plan
        </h1>
        <p className="text-[#888888] text-[15px] mt-2">
          Revisá los detalles y procedé al pago seguro.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Summary card */}
      <div className="bg-white border border-[#EAEAEA] rounded-2xl overflow-hidden shadow-sm">
        {/* Plan header */}
        <div className="p-6 sm:p-7 flex justify-between items-start border-b border-[#EAEAEA]">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-emerald-600">Plan seleccionado</span>
            <h3 className="text-xl font-bold text-[#111111] mt-1">{planInfo.name}</h3>
            <p className="text-[13px] text-[#999999] mt-0.5">Renovación mensual automática</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-extrabold text-[#111111] tracking-tight">{formatPrice(planInfo.monthlyPrice)}</div>
            <p className="text-[13px] text-[#999999]">por mes</p>
          </div>
        </div>

        {/* Breakdown */}
        <div className="p-6 sm:p-7 space-y-4 border-b border-[#EAEAEA]">
          {summaryLines.map((line, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <line.icon className="w-4 h-4 text-[#CCCCCC]" />
                <span className="text-[13px] text-[#666666]">{line.label}</span>
              </div>
              <span className="text-[13px] font-semibold text-[#111111]">{line.value}</span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="p-6 sm:p-7 flex justify-between items-center border-b border-[#EAEAEA] bg-[#FAFAFA]">
          <span className="text-base font-bold text-[#111111]">Total a pagar hoy</span>
          <span className="text-xl font-extrabold text-[#111111]">{formatPrice(planInfo.monthlyPrice)}</span>
        </div>

        {/* Payment method */}
        <div className="p-6 sm:p-7">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#F5F5F5] flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-[#888888]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#111111]">Mercado Pago</p>
              <p className="text-[12px] text-[#999999]">Tarjeta, débito o dinero en cuenta</p>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full py-4 rounded-xl font-semibold text-[15px] bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-200 flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Redirigiendo a Mercado Pago…
              </>
            ) : (
              <>
                Confirmar y pagar
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Trust bar */}
      <div className="flex items-center justify-center gap-6 text-[11px] text-[#999999] font-medium">
        <span className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          Pago seguro SSL
        </span>
        <span className="flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-emerald-500" />
          Cancelá cuando quieras
        </span>
      </div>

      <p className="text-[11px] text-center text-[#AAAAAA] max-w-md mx-auto leading-relaxed">
        Al confirmar, aceptás los Términos de Servicio. Los impuestos locales se calcularán en Mercado Pago.
      </p>
    </div>
  );
}
