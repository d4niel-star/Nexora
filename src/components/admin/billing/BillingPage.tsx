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
        <Loader2 className="h-6 w-6 animate-spin text-[#CCCCCC]" />
      </div>
    );
  }

  if (!data) return <p className="text-center text-sm text-gray-500">No se encontró tienda</p>;

  const creditPercent = data.credits.total > 0 ? Math.round((data.credits.used / data.credits.total) * 100) : 0;
  const currentPlanIdx = plans.findIndex(p => p.code === data.plan.code);

  return (
    <div className="animate-in fade-in duration-500 space-y-10">
      {/* ─── Header ─── */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-[#111111] leading-none">Plan y facturación</h1>
          <p className="mt-2 text-[13px] text-[#999999]">Gestioná tu suscripción, créditos y consumo.</p>
        </div>
        <div className="hidden md:flex items-center gap-1.5 rounded-full border border-[#E5E5E5] bg-white px-3 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="text-xs font-semibold text-[#111111]">{data.plan.name}</span>
          <span className="text-xs text-[#999999]">· Activo</span>
        </div>
      </div>

      {/* ─── Overview Cards ─── */}
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-[#E5E5E5] bg-[#E5E5E5] md:grid-cols-3">
        {/* Plan */}
        <div className="flex flex-col justify-between bg-white p-7">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#AAAAAA]">Plan actual</span>
          <div className="mt-4">
            <span className="text-[32px] font-extrabold tracking-tight text-[#111111] leading-none">{data.plan.name}</span>
            {data.plan.monthlyPrice > 0 && (
              <p className="mt-1.5 text-sm text-[#999999]">
                <span className="text-[#111111] font-semibold">${data.plan.monthlyPrice.toLocaleString("es-AR")}</span> /mes
              </p>
            )}
            {data.plan.monthlyPrice === 0 && <p className="mt-1.5 text-sm text-[#999999]">Sin cargo</p>}
          </div>
        </div>

        {/* Credits */}
        <div className="flex flex-col justify-between bg-white p-7">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#AAAAAA]">Créditos IA</span>
          <div className="mt-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[32px] font-extrabold tracking-tight text-[#111111] leading-none">{data.credits.remaining}</span>
              <span className="text-sm text-[#BBBBBB] font-medium">/ {data.credits.total}</span>
            </div>
            <div className="mt-3 h-1 rounded-full bg-[#F0F0F0] overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  creditPercent > 85 ? "bg-[#E5484D]" : creditPercent > 60 ? "bg-[#F5A623]" : "bg-[#111111]"
                )}
                style={{ width: `${Math.min(creditPercent, 100)}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-[#BBBBBB]">{data.credits.used} consumidos</p>
            <button 
              onClick={handleBuyCredits} 
              disabled={isPending}
              className="mt-4 w-full py-2 bg-[#FAFAFA] border border-[#EAEAEA] rounded hover:bg-[#F0F0F0] text-xs font-bold transition-colors disabled:opacity-50"
            >
              Comprar 1,000 Créditos Extras ($20.000)
            </button>
          </div>
        </div>

        {/* Usage */}
        <div className="flex flex-col justify-between bg-white p-7">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#AAAAAA]">Uso actual</span>
          <div className="mt-4 space-y-2.5">
            <UsageRow label="Productos" value={data.usage.products} />
            <UsageRow label="Pedidos" value={data.usage.orders} />
            <UsageRow label="Interacciones IA" value={data.usage.aiInteractions} />
          </div>
        </div>
      </div>

      {/* ─── Credit Costs ─── */}
      <div className="flex items-center gap-6 overflow-x-auto rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] px-6 py-4">
        <div className="flex items-center gap-2 shrink-0">
          <Zap className="h-3.5 w-3.5 text-[#888888]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#888888]">Costos</span>
        </div>
        <div className="h-4 w-px bg-[#E5E5E5] shrink-0" />
        <CostPill label="Chat IA" cost="1 cr" />
        <CostPill label="AI Studio" cost="10 cr" />
        <CostPill label="Regenerar sección" cost="3 cr" />
      </div>

      {/* ─── Plans ─── */}
      <div>
        <h2 className="text-lg font-extrabold tracking-tight text-[#111111]">Planes</h2>
        <p className="mt-1 text-[13px] text-[#999999] mb-8">Elegí el que mejor se adapte a tu volumen.</p>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan, idx) => {
            const isCurrent = plan.code === data.plan.code;
            const isHigher = plan.sortOrder > (currentPlanIdx >= 0 ? plans[currentPlanIdx].sortOrder : 0);

            return (
              <div
                key={plan.code}
                className={cn(
                  "group relative flex flex-col rounded-2xl border transition-all",
                  isCurrent
                    ? "border-[#111111] bg-[#111111]"
                    : plan.highlight
                    ? "border-[#111111]/20 bg-white hover:border-[#111111]/40"
                    : "border-[#E5E5E5] bg-white hover:border-[#CCCCCC]"
                )}
              >
                {plan.badge && (
                  <span className="absolute -top-2.5 left-5 rounded-md bg-[#111111] px-2.5 py-0.5 text-[10px] font-bold text-white tracking-wide">
                    {plan.badge}
                  </span>
                )}

                <div className="p-6 flex-1">
                  <p className={cn("text-[13px] font-bold", isCurrent ? "text-white/60" : "text-[#888888]")}>
                    {plan.name}
                  </p>
                  <div className="mt-3 flex items-baseline gap-1">
                    {plan.monthlyPrice === 0 ? (
                      <span className={cn("text-[28px] font-extrabold tracking-tight leading-none", isCurrent ? "text-white" : "text-[#111111]")}>
                        Gratis
                      </span>
                    ) : (
                      <>
                        <span className={cn("text-[28px] font-extrabold tracking-tight leading-none", isCurrent ? "text-white" : "text-[#111111]")}>
                          ${(plan.monthlyPrice / 1000).toFixed(0)}k
                        </span>
                        <span className={cn("text-xs font-medium", isCurrent ? "text-white/40" : "text-[#BBBBBB]")}>/mes</span>
                      </>
                    )}
                  </div>

                  <div className={cn("mt-6 space-y-2.5", isCurrent ? "text-white/70" : "")}>
                    <PlanLine text={`${plan.config.aiCredits} créditos IA`} active={isCurrent} />
                    <PlanLine text={plan.config.maxProducts === 0 ? "Productos ilimitados" : `${plan.config.maxProducts} productos`} active={isCurrent} />
                    <PlanLine text={plan.config.maxOrdersPerMonth === 0 ? "Pedidos ilimitados" : `${plan.config.maxOrdersPerMonth} pedidos/mes`} active={isCurrent} />
                    {plan.config.customDomain && <PlanLine text="Dominio custom" active={isCurrent} />}
                    {plan.config.byokEnabled && <PlanLine text="BYOK — tu propia IA" active={isCurrent} />}
                    {plan.config.aiStudioAdvanced && <PlanLine text="AI Studio avanzado" active={isCurrent} />}
                    {plan.config.advancedCarriers && <PlanLine text="Logística avanzada" active={isCurrent} />}
                    <PlanLine text={`${plan.config.maxStaff} ${plan.config.maxStaff === 1 ? "usuario" : "usuarios"}`} active={isCurrent} />
                  </div>
                </div>

                <div className="px-6 pb-6">
                  {isCurrent ? (
                    <div className="flex items-center justify-center gap-1.5 rounded-lg bg-white/10 py-2.5 text-xs font-semibold text-white/60">
                      <Check className="h-3.5 w-3.5" />
                      Tu plan actual
                    </div>
                  ) : isHigher ? (
                    <button
                      onClick={() => handleUpgrade(plan.code)}
                      disabled={isPending}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#111111] py-2.5 text-xs font-semibold text-white transition-all hover:bg-black disabled:opacity-40"
                      type="button"
                    >
                      Actualizar a {plan.name}
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <div className="py-2.5 text-center text-xs font-medium text-[#CCCCCC]">—</div>
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
          <h2 className="text-lg font-extrabold tracking-tight text-[#111111]">Movimientos</h2>
          <p className="mt-1 text-[13px] text-[#999999] mb-5">Registro reciente de créditos.</p>

          <div className="rounded-xl border border-[#E5E5E5] overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto] gap-4 bg-[#FAFAFA] px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#AAAAAA]">
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
                    "grid grid-cols-[1fr_auto_auto] gap-4 items-center px-5 py-3 bg-white",
                    i > 0 && "border-t border-[#F0F0F0]"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                      tx.amount > 0 ? "bg-emerald-50 text-emerald-600" : "bg-[#F5F5F5] text-[#999999]"
                    )}>
                      {tx.amount > 0 ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#111111] truncate">{labels[tx.type] || tx.type}</p>
                      <p className="text-[11px] text-[#BBBBBB]">{sourceLabels[tx.source] || tx.source}</p>
                    </div>
                  </div>
                  <div className="w-20 text-right">
                    <span className={cn("text-[13px] font-bold tabular-nums", tx.amount > 0 ? "text-emerald-600" : "text-[#111111]")}>
                      {tx.amount > 0 ? "+" : ""}{tx.amount}
                    </span>
                  </div>
                  <div className="w-20 text-right">
                    <span className="text-[11px] text-[#BBBBBB] tabular-nums">
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
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-3 fade-in rounded-lg border border-[#E5E5E5] bg-[#111111] px-5 py-3 text-sm font-semibold text-white shadow-2xl">
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
      <span className="text-[13px] text-[#999999]">{label}</span>
      <span className="text-[13px] font-bold text-[#111111] tabular-nums">{value}</span>
    </div>
  );
}

function CostPill({ label, cost }: { label: string; cost: string }) {
  return (
    <div className="flex items-center gap-2 shrink-0 text-[12px]">
      <span className="text-[#888888]">{label}</span>
      <span className="rounded-md bg-white border border-[#E5E5E5] px-2 py-0.5 font-bold text-[#111111] text-[11px]">{cost}</span>
    </div>
  );
}

function PlanLine({ text, active }: { text: string; active: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <Check className={cn("h-3 w-3 shrink-0", active ? "text-white/50" : "text-[#CCCCCC]")} />
      <span className={cn(active ? "text-white/70" : "text-[#777777]")}>{text}</span>
    </div>
  );
}
