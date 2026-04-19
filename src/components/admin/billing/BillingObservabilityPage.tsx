"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  CreditCard,
  Loader2,
  TrendingUp,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getBillingObservabilityAction } from "@/lib/billing/actions";
import type { BillingObservabilityData } from "@/lib/billing/observability";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);

export function BillingObservabilityPage() {
  const [data, setData] = useState<BillingObservabilityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getBillingObservabilityAction()
      .then(setData)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-ink-5" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-[13px] text-ink-5">No se pudieron cargar los datos de observabilidad.</p>
      </div>
    );
  }

  const { statusCounts, planDistribution, transactionSummary, dunningMetrics, recentPlanChanges } = data;

  // Recovery rate: if there were payment failures, what % were recovered
  const hasRecoveryData = dunningMetrics.paymentFailureEvents > 0;
  const recoveryRate = hasRecoveryData
    ? Math.round((dunningMetrics.reactivationEvents / dunningMetrics.paymentFailureEvents) * 100)
    : null;

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      {/* ─── Header ─── */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/billing"
          className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] text-ink-5 transition-colors hover:bg-[var(--surface-1)] hover:text-ink-0"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
        </Link>
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink-0">
            Observabilidad Comercial
          </h1>
          <p className="mt-0.5 text-[12px] text-ink-5">
            Métricas reales de monetización · Últimos 30 días
          </p>
        </div>
      </div>

      {/* ─── Section 1: Estado actual ─── */}
      <section>
        <SectionHeader icon={Users} label="Estado de suscripciones" />
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <MetricCard
            label="Activas"
            value={statusCounts.active}
            color="success"
            icon={CheckCircle2}
          />
          <MetricCard
            label="En trial"
            value={statusCounts.trialing}
            color="info"
            icon={Activity}
          />
          <MetricCard
            label="Pago pendiente"
            value={statusCounts.past_due}
            color="warning"
            icon={AlertTriangle}
          />
          <MetricCard
            label="Impagas"
            value={statusCounts.unpaid}
            color="danger"
            icon={XCircle}
          />
          <MetricCard
            label="Canceladas"
            value={statusCounts.cancelled}
            color="danger"
            icon={XCircle}
          />
          <MetricCard
            label="Trial expirado"
            value={statusCounts.trial_expired}
            color="muted"
            icon={Activity}
          />
          <MetricCard
            label="Total suscripciones"
            value={statusCounts.total}
            color="neutral"
            icon={Users}
          />
        </div>
      </section>

      {/* ─── Section 2: Distribución por plan ─── */}
      <section>
        <SectionHeader icon={BarChart3} label="Cuentas activas por plan" />
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {["core", "growth", "scale"].map((code) => {
            const plan = planDistribution.find((p) => p.planCode === code);
            return (
              <div
                key={code}
                className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-5">
                  {plan?.planName || code}
                </p>
                <p className="mt-2 text-[28px] font-bold tracking-[-0.03em] text-ink-0">
                  {plan?.count ?? 0}
                </p>
                <p className="text-[11px] text-ink-6">cuentas activas</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Section 3: Transacciones (30d) ─── */}
      <section>
        <SectionHeader icon={CreditCard} label="Transacciones · 30 días" />
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard
            label="Upgrades intentados"
            value={transactionSummary.totalUpgrades}
            color="neutral"
            icon={TrendingUp}
          />
          <MetricCard
            label="Upgrades exitosos"
            value={transactionSummary.approvedUpgrades}
            color="success"
            icon={CheckCircle2}
          />
          <MetricCard
            label="Upgrades fallidos"
            value={transactionSummary.failedUpgrades}
            color="danger"
            icon={XCircle}
          />
          <MetricCard
            label="Packs de créditos"
            value={transactionSummary.approvedCreditPacks}
            color="info"
            icon={Zap}
          />
        </div>
        <div className="mt-3 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-5">
            Ingresos confirmados (30d)
          </p>
          <p className="mt-2 text-[32px] font-bold tracking-[-0.03em] text-ink-0">
            {formatCurrency(transactionSummary.totalRevenueARS)}
          </p>
          <p className="text-[11px] text-ink-6">
            Upgrades + packs de créditos aprobados en MercadoPago
          </p>
        </div>
      </section>

      {/* ─── Section 4: Dunning & Recovery ─── */}
      <section>
        <SectionHeader icon={AlertTriangle} label="Dunning & Recovery · 30 días" />
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <MetricCard
            label="Cuentas past_due"
            value={dunningMetrics.currentPastDue}
            color={dunningMetrics.currentPastDue > 0 ? "warning" : "success"}
            icon={AlertTriangle}
          />
          <MetricCard
            label="Cuentas impagas"
            value={dunningMetrics.currentUnpaid}
            color={dunningMetrics.currentUnpaid > 0 ? "danger" : "success"}
            icon={XCircle}
          />
          <MetricCard
            label="Canceladas"
            value={dunningMetrics.currentCancelled}
            color={dunningMetrics.currentCancelled > 0 ? "danger" : "success"}
            icon={XCircle}
          />
          <MetricCard
            label="Fallos de pago"
            value={dunningMetrics.paymentFailureEvents}
            color="danger"
            icon={CreditCard}
          />
          <MetricCard
            label="Emails de dunning"
            value={dunningMetrics.dunningEmailsSent}
            color="neutral"
            icon={Activity}
          />
          <MetricCard
            label="Avisos de suspensión"
            value={dunningMetrics.suspensionWarningsSent}
            color="warning"
            icon={AlertTriangle}
          />
          <MetricCard
            label="Reactivaciones"
            value={dunningMetrics.reactivationEvents}
            color="success"
            icon={CheckCircle2}
          />
          <MetricCard
            label="Emails de reactivación"
            value={dunningMetrics.reactivationEmailsSent}
            color="success"
            icon={CheckCircle2}
          />
        </div>
        {/* Recovery rate — only if there's real data */}
        {hasRecoveryData ? (
          <div className="mt-3 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-5">
              Tasa de recuperación (30d)
            </p>
            <p className="mt-2 text-[32px] font-bold tracking-[-0.03em] text-ink-0">
              {recoveryRate}%
            </p>
            <p className="text-[11px] text-ink-6">
              {dunningMetrics.reactivationEvents} reactivaciones / {dunningMetrics.paymentFailureEvents} fallos de pago
            </p>
          </div>
        ) : (
          <div className="mt-3 rounded-[var(--r-md)] border border-dashed border-[color:var(--hairline)] bg-[var(--surface-1)] p-5 text-center">
            <p className="text-[12px] text-ink-5">
              No hay datos de fallos de pago en los últimos 30 días. La tasa de recuperación se calculará cuando existan eventos reales.
            </p>
          </div>
        )}
      </section>

      {/* ─── Section 5: Cambios de plan recientes ─── */}
      <section>
        <SectionHeader icon={ArrowUpRight} label="Cambios de plan recientes" />
        {recentPlanChanges.length === 0 ? (
          <div className="mt-3 rounded-[var(--r-md)] border border-dashed border-[color:var(--hairline)] bg-[var(--surface-1)] p-5 text-center">
            <p className="text-[12px] text-ink-5">
              No se registraron cambios de plan recientes.
            </p>
          </div>
        ) : (
          <div className="mt-3 overflow-hidden rounded-[var(--r-md)] border border-[color:var(--hairline)]">
            <table className="w-full text-left">
              <thead className="bg-[var(--surface-1)]">
                <tr>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-5">
                    Store
                  </th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-5">
                    Nuevo plan
                  </th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-5 text-right">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--hairline)] bg-[var(--surface-0)]">
                {recentPlanChanges.map((event, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2.5 text-[12px] text-ink-3 font-mono">
                      {event.storeId.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center rounded-[var(--r-xs)] bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-medium text-ink-2">
                        {event.newPlanCode}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-ink-5 text-right">
                      {new Date(event.timestamp).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ─── Footer note ─── */}
      <div className="rounded-[var(--r-sm)] bg-[var(--surface-1)] px-4 py-3 text-center">
        <p className="text-[11px] text-ink-6">
          Todas las métricas provienen de fuentes auditables: StoreSubscription, BillingTransaction, SystemEvent, EmailLog.
          No se utilizan estimaciones ni proyecciones.
        </p>
      </div>
    </div>
  );
}

// ─── Building blocks ───

function SectionHeader({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-ink-5" strokeWidth={1.75} />
      <h2 className="text-[13px] font-semibold text-ink-2 tracking-[-0.01em]">
        {label}
      </h2>
    </div>
  );
}

type MetricColor = "success" | "warning" | "danger" | "info" | "neutral" | "muted";

const colorMap: Record<MetricColor, { bg: string; icon: string; value: string }> = {
  success: {
    bg: "bg-[#ECFDF5]",
    icon: "text-[#059669]",
    value: "text-[#065F46]",
  },
  warning: {
    bg: "bg-[#FFFBEB]",
    icon: "text-[#D97706]",
    value: "text-[#92400E]",
  },
  danger: {
    bg: "bg-[#FEF2F2]",
    icon: "text-[#DC2626]",
    value: "text-[#991B1B]",
  },
  info: {
    bg: "bg-[#EFF6FF]",
    icon: "text-[#2563EB]",
    value: "text-[#1E40AF]",
  },
  neutral: {
    bg: "bg-[var(--surface-0)]",
    icon: "text-ink-5",
    value: "text-ink-0",
  },
  muted: {
    bg: "bg-[var(--surface-1)]",
    icon: "text-ink-6",
    value: "text-ink-4",
  },
};

function MetricCard({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  color: MetricColor;
  icon: any;
}) {
  const c = colorMap[color];
  return (
    <div
      className={cn(
        "rounded-[var(--r-md)] border border-[color:var(--hairline)] p-4",
        c.bg,
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn("h-3.5 w-3.5", c.icon)} strokeWidth={1.75} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-5">
          {label}
        </span>
      </div>
      <p className={cn("mt-2 text-[24px] font-bold tracking-[-0.03em]", c.value)}>
        {value}
      </p>
    </div>
  );
}
