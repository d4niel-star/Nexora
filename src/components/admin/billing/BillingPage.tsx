"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Loader2,
  Minus,
  Plus,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getBillingDataAction,
  getPlansAction,
  upgradePlanAction,
  buyCreditsAction
} from "@/lib/billing/actions";
import type { PlanDefinition, PlanConfig } from "@/lib/billing/plans";

// ─── Types ───

interface BillingData {
  storeId: string;
  plan: { code: string; name: string; monthlyPrice: number; currency: string };
  subscription: { status: string; startedAt: string; renewsAt: string | null };
  credits: { total: number; used: number; remaining: number };
  entitlements: PlanConfig;
  usage: { products: number; orders: number; aiInteractions: number; aiTokens: number };
  recentTransactions: { id: string; type: string; amount: number; source: string; createdAt: string }[];
}

// ─── Main ───

export function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [plans, setPlans] = useState<PlanDefinition[]>([]);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    Promise.all([getBillingDataAction(), getPlansAction()]).then(([billing, p]) => {
      setData(billing as BillingData | null);
      setPlans(p);
      setIsLoading(false);
    });
  }, []);

  const handleUpgrade = (planCode: string) => {
    startTransition(async () => {
      try {
        const result = await upgradePlanAction(planCode);
        if (result.redirectUrl) {
           window.location.href = result.redirectUrl;
           return;
        }
        showToast(`Plan actualizado correctamente`);
        const billing = await getBillingDataAction();
        setData(billing);
      } catch (e: any) {
        showToast(e.message);
      }
    });
  };

  const handleBuyCredits = () => {
    startTransition(async () => {
      try {
        const result = await buyCreditsAction(1000, 20000); // 1000 credits for 20000 ARS
        if (result.redirectUrl) {
           window.location.href = result.redirectUrl;
        }
      } catch (e: any) {
        showToast(e.message);
      }
    })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-ink-5" strokeWidth={1.75} />
      </div>
    );
  }

  if (!data) return <p className="text-center text-[13px] text-ink-5">No se encontró tienda</p>;

  const creditPercent = data.credits.total > 0 ? Math.round((data.credits.used / data.credits.total) * 100) : 0;
  const currentPlanIdx = plans.findIndex(p => p.code === data.plan.code);

  const formatARS = (v: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(v);

  return (
    <div className="animate-in fade-in duration-500 space-y-10">
      {/* ─── Header ─── */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] lg:text-[32px] font-semibold leading-[1.08] tracking-[-0.035em] text-ink-0">Plan y facturación.</h1>
          <p className="mt-2 text-[13px] text-ink-5">Gestioná tu suscripción, créditos y consumo.</p>
        </div>
        <div className="hidden md:flex items-center gap-1.5 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2.5 h-7">
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--signal-success)]" />
          <span className="text-[11px] font-medium text-ink-0">{data.plan.name}</span>
          <span className="text-[11px] text-ink-5">· Activo</span>
        </div>
      </div>

      {/* ─── Overview Cards ─── */}
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[color:var(--hairline)] md:grid-cols-3">
        {/* Plan */}
        <div className="flex flex-col justify-between bg-[var(--surface-0)] p-7">
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Plan actual</span>
          <div className="mt-4">
            <span className="text-[28px] font-semibold tracking-[-0.03em] text-ink-0 leading-none">{data.plan.name}</span>
            {data.plan.monthlyPrice > 0 && (
              <p className="mt-1.5 text-sm text-ink-5">
                <span className="text-ink-0 font-semibold">{formatARS(data.plan.monthlyPrice)}</span> /mes
              </p>
            )}
            {data.plan.monthlyPrice === 0 && <p className="mt-1.5 text-sm text-ink-5">Consultar</p>}
          </div>
        </div>

        {/* Credits */}
        <div className="flex flex-col justify-between bg-[var(--surface-0)] p-7">
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Créditos IA</span>
          <div className="mt-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[28px] font-semibold tracking-[-0.03em] text-ink-0 leading-none tabular-nums">{data.credits.remaining}</span>
              <span className="text-sm text-ink-6 font-medium">/ {data.credits.total}</span>
            </div>
            <div className="mt-3 h-1 rounded-full bg-[var(--surface-2)] overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  creditPercent > 85 ? "bg-[color:var(--signal-danger)]" : creditPercent > 60 ? "bg-[color:var(--signal-warning)]" : "bg-ink-0"
                )}
                style={{ width: `${Math.min(creditPercent, 100)}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-ink-6">{data.credits.used} consumidos</p>
            <button 
              onClick={handleBuyCredits} 
              disabled={isPending}
              className="mt-4 w-full h-9 rounded-[var(--r-sm)] bg-[var(--surface-0)] border border-[color:var(--hairline-strong)] text-[12px] font-medium text-ink-0 hover:bg-[var(--surface-2)] transition-colors disabled:opacity-50"
            >
              Comprar 1.000 créditos extras ({formatARS(20000)})
            </button>
          </div>
        </div>

        {/* Usage */}
        <div className="flex flex-col justify-between bg-[var(--surface-0)] p-7">
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Uso actual</span>
          <div className="mt-4 space-y-2.5">
            <UsageRow label="Productos" value={data.usage.products} />
            <UsageRow label="Pedidos" value={data.usage.orders} />
            <UsageRow label="Interacciones IA" value={data.usage.aiInteractions} />
          </div>
        </div>
      </div>

      {/* ─── Credit Costs ─── */}
      <div className="flex items-center gap-6 overflow-x-auto rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-6 py-4">
        <div className="flex items-center gap-2 shrink-0">
          <Zap className="h-3.5 w-3.5 text-ink-5" strokeWidth={1.75} />
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Costos</span>
        </div>
        <div className="h-4 w-px bg-[color:var(--hairline-strong)] shrink-0" />
        <CostPill label="Chat IA" cost="1 cr" />
        <CostPill label="AI Studio" cost="10 cr" />
        <CostPill label="Regenerar sección" cost="3 cr" />
      </div>

      {/* ─── Plans ─── */}
      <div>
        <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink-0">Planes.</h2>
        <p className="mt-1.5 text-[13px] text-ink-5 mb-8">Elegí el que mejor se adapte a tu volumen.</p>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan, idx) => {
            const isCurrent = plan.code === data.plan.code;
            const isHigher = plan.sortOrder > (currentPlanIdx >= 0 ? plans[currentPlanIdx].sortOrder : 0);

            return (
              <div
                key={plan.code}
                className={cn(
                  "group relative flex flex-col rounded-[var(--r-md)] border transition-colors",
                  isCurrent
                    ? "border-ink-0 bg-ink-0"
                    : plan.highlight
                    ? "border-[color:var(--hairline-strong)] bg-[var(--surface-0)] hover:bg-[var(--surface-1)]"
                    : "border-[color:var(--hairline)] bg-[var(--surface-0)] hover:border-[color:var(--hairline-strong)]"
                )}
              >
                {plan.badge && (
                  <span className="absolute -top-2 left-5 inline-flex items-center h-5 rounded-[var(--r-xs)] bg-ink-0 px-2 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-12">
                    {plan.badge}
                  </span>
                )}

                <div className="p-6 flex-1">
                  <p className={cn("text-[11px] font-medium uppercase tracking-[0.14em]", isCurrent ? "text-ink-12/60" : "text-ink-5")}>
                    {plan.name}
                  </p>
                  <div className="mt-3 flex items-baseline gap-1">
                    {plan.monthlyPrice === 0 ? (
                      <span className={cn("text-[28px] font-semibold tracking-[-0.03em] leading-none", isCurrent ? "text-ink-12" : "text-ink-0")}>
                        Consultar
                      </span>
                    ) : (
                      <>
                        <span className={cn("text-[28px] font-semibold tracking-[-0.03em] leading-none tabular-nums", isCurrent ? "text-ink-12" : "text-ink-0")}>
                          {formatARS(plan.monthlyPrice)}
                        </span>
                        <span className={cn("text-[11px] font-medium", isCurrent ? "text-ink-12/50" : "text-ink-5")}>/ mes</span>
                      </>
                    )}
                  </div>

                  <div className={cn("mt-6 space-y-2.5", isCurrent ? "text-ink-12/80" : "")}>
                    <PlanLine text={plan.config.aiCredits === 0 ? "Créditos a medida" : `${plan.config.aiCredits} créditos IA`} active={isCurrent} />
                    <PlanLine text={plan.config.maxProducts === 0 ? "Productos ilimitados" : `${plan.config.maxProducts} productos`} active={isCurrent} />
                    <PlanLine text={plan.config.maxOrdersPerMonth === 0 ? "Pedidos ilimitados" : `${plan.config.maxOrdersPerMonth} pedidos/mes`} active={isCurrent} />
                    {plan.config.customDomain && <PlanLine text="Dominio custom" active={isCurrent} />}
                    {plan.config.byokEnabled && <PlanLine text="BYOK — tu propia IA" active={isCurrent} />}
                    {plan.config.aiStudioAdvanced && <PlanLine text="AI Studio avanzado" active={isCurrent} />}
                    {plan.config.advancedCarriers && <PlanLine text="Logística avanzada" active={isCurrent} />}
                    <PlanLine text={plan.config.maxStaff === 0 ? "Usuarios ilimitados" : `${plan.config.maxStaff} ${plan.config.maxStaff === 1 ? "usuario" : "usuarios"}`} active={isCurrent} />
                  </div>
                </div>

                <div className="px-6 pb-6">
                  {isCurrent ? (
                    <div className="inline-flex w-full items-center justify-center gap-1.5 rounded-[var(--r-sm)] border border-ink-12/15 h-10 text-[12px] font-medium text-ink-12/70">
                      <Check className="h-3.5 w-3.5" strokeWidth={2} />
                      Tu plan actual
                    </div>
                  ) : isHigher ? (
                    <button
                      onClick={() => handleUpgrade(plan.code)}
                      disabled={isPending}
                      className="flex w-full items-center justify-center gap-1.5 rounded-[var(--r-sm)] bg-ink-0 h-10 text-[12px] font-medium text-ink-12 transition-colors hover:bg-ink-2 disabled:opacity-40"
                      type="button"
                    >
                      Actualizar a {plan.name}
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <div className="h-10 flex items-center justify-center text-[12px] font-medium text-ink-6">—</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Transactions ─── */}
      {data.recentTransactions.length > 0 && (
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink-0">Movimientos.</h2>
          <p className="mt-1.5 text-[13px] text-ink-5 mb-5">Registro reciente de créditos.</p>

          <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto] gap-4 bg-[var(--surface-1)] border-b border-[color:var(--hairline)] px-5 py-2.5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
              <span>Concepto</span>
              <span className="text-right w-20">Monto</span>
              <span className="text-right w-20">Fecha</span>
            </div>

            {data.recentTransactions.map((tx, i) => {
              const labels: Record<string, string> = {
                grant_free: "Créditos otorgados",
                grant_paid: "Créditos comprados",
                consume: "Consumo",
                refund: "Reembolso",
                expire: "Expirados",
              };
              const sourceLabels: Record<string, string> = {
                onboarding: "Registro inicial",
                plan_upgrade: "Upgrade de plan",
                ai_chat_message: "Chat IA",
                ai_studio_generation: "AI Studio",
                ai_studio_section_regen: "Regenerar sección",
                manual: "Ajuste manual",
                purchase: "Compra",
              };

              return (
                <div
                  key={tx.id}
                  className={cn(
                    "grid grid-cols-[1fr_auto_auto] gap-4 items-center px-5 py-3 bg-[var(--surface-0)]",
                    i > 0 && "border-t border-[color:var(--hairline)]"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)]",
                      tx.amount > 0 ? "text-[color:var(--signal-success)]" : "text-ink-5"
                    )}>
                      {tx.amount > 0 ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-ink-0 truncate">{labels[tx.type] || tx.type}</p>
                      <p className="text-[11px] text-ink-6">{sourceLabels[tx.source] || tx.source}</p>
                    </div>
                  </div>
                  <div className="w-20 text-right">
                    <span className={cn("text-[13px] font-medium tabular-nums", tx.amount > 0 ? "text-[color:var(--signal-success)]" : "text-ink-0")}>
                      {tx.amount > 0 ? "+" : ""}{tx.amount}
                    </span>
                  </div>
                  <div className="w-20 text-right">
                    <span className="text-[11px] text-ink-6 tabular-nums">
                      {new Date(tx.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Toast ─── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-3 fade-in rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-4 py-3 text-[13px] font-medium text-ink-0 shadow-[var(--shadow-overlay)]">
          {toast}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───

function UsageRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-ink-5">{label}</span>
      <span className="text-[13px] font-semibold text-ink-0 tabular-nums">{value}</span>
    </div>
  );
}

function CostPill({ label, cost }: { label: string; cost: string }) {
  return (
    <div className="flex items-center gap-2 shrink-0 text-[12px]">
      <span className="text-ink-5">{label}</span>
      <span className="inline-flex items-center h-6 rounded-[var(--r-xs)] bg-[var(--surface-0)] border border-[color:var(--hairline)] px-2 font-medium tabular-nums text-ink-0 text-[11px]">{cost}</span>
    </div>
  );
}

function PlanLine({ text, active }: { text: string; active: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <Check className={cn("h-3 w-3 shrink-0", active ? "text-ink-12/50" : "text-ink-6")} strokeWidth={2} />
      <span className={cn(active ? "text-ink-12/80" : "text-ink-4")}>{text}</span>
    </div>
  );
}
