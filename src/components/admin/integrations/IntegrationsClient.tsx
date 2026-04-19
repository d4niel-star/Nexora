"use client";

import { useMemo, useState } from "react";
import { Search, CreditCard, Plug, Radio, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UnifiedConnection } from "@/lib/integrations/queries";
import type { HealthCenterData } from "@/types/health";
import { HealthCenter } from "./HealthCenter";

type TabValue = "all" | "payments" | "providers" | "ads" | "health";

export function IntegrationsClient({ initialData, healthData }: { initialData: UnifiedConnection[]; healthData: HealthCenterData }) {
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const tabCounts = useMemo(() => ({
    all: initialData.length,
    payments: initialData.filter(c => c.type === "payment").length,
    providers: initialData.filter(c => c.type === "provider").length,
    ads: initialData.filter(c => c.type === "ad_platform").length,
  }), [initialData]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return initialData.filter(c => {
      const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.platform.toLowerCase().includes(q);
      const matchesTab = 
        activeTab === "all" ? true
        : activeTab === "payments" ? c.type === "payment"
        : activeTab === "providers" ? c.type === "provider"
        : activeTab === "ads" ? c.type === "ad_platform"
        : false;
      return matchesSearch && matchesTab;
    });
  }, [searchQuery, activeTab, initialData]);

  const tabs: Array<{ label: string; value: TabValue; count: number; icon: React.ReactNode }> = [
    { label: "Todas", value: "all", count: tabCounts.all, icon: <Radio className="h-3.5 w-3.5" /> },
    { label: "Publicidad", value: "ads", count: tabCounts.ads, icon: <Radio className="h-3.5 w-3.5" /> },
    { label: "Pagos", value: "payments", count: tabCounts.payments, icon: <CreditCard className="h-3.5 w-3.5" /> },
    { label: "Proveedores", value: "providers", count: tabCounts.providers, icon: <Plug className="h-3.5 w-3.5" /> },
    { label: "Salud", value: "health", count: healthData.signals.length, icon: <ShieldCheck className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="animate-in fade-in space-y-8 pb-32 duration-700">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1 className="text-[28px] lg:text-[32px] font-semibold leading-[1.08] tracking-[-0.035em] text-ink-0">Integraciones.</h1>
          <p className="mt-2 text-[14px] leading-[1.55] text-ink-5">Conexiones activas de la tienda a servicios externos.</p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)]">
        <div className="flex items-center gap-7 overflow-x-auto border-b border-[color:var(--hairline)] bg-[var(--surface-1)] px-6 no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              className={cn("group relative whitespace-nowrap py-4 text-[13px] font-medium transition-colors", activeTab === tab.value ? "text-ink-0" : "text-ink-5 hover:text-ink-0")}
              onClick={() => setActiveTab(tab.value)}
            >
              <span className="flex items-center gap-2">
                {tab.icon}
                {tab.label}
                <span className={cn("tabular inline-flex items-center h-5 px-1.5 rounded-[var(--r-xs)] text-[10px] font-medium uppercase tracking-[0.14em]", activeTab === tab.value ? "bg-[var(--surface-2)] text-ink-0" : "bg-transparent text-ink-6 group-hover:bg-[var(--surface-2)]")}>{tab.count}</span>
              </span>
              {activeTab === tab.value ? <div className="absolute inset-x-0 bottom-0 h-[2px] bg-ink-0" /> : null}
            </button>
          ))}
        </div>

        <div className="p-4 border-b border-[color:var(--hairline)] bg-[var(--surface-0)]">
          <div className="relative w-full md:max-w-md group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-6 group-focus-within:text-ink-0 transition-colors" strokeWidth={1.75} />
            <input
              type="text"
              placeholder="Buscar integración…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 h-10 bg-[var(--surface-1)] border border-[color:var(--hairline)] rounded-[var(--r-sm)] text-[13px] text-ink-0 placeholder:text-ink-6 outline-none transition-[box-shadow,border-color] focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)] focus:bg-[var(--surface-0)]"
            />
          </div>
        </div>

        <div className="min-h-[400px] bg-[var(--surface-0)] p-6">
          {activeTab === "health" ? (
            <HealthCenter data={healthData} />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="mb-6 inline-flex items-center justify-center w-14 h-14 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
                <Plug className="h-5 w-5 text-ink-5" strokeWidth={1.5} />
              </div>
              <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-ink-0">No hay conexiones.</h3>
              <p className="mt-2 text-[13px] leading-[1.55] text-ink-5 max-w-sm">No se encontraron integraciones reales instaladas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(c => (
                <div key={c.id} className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-[14px] font-semibold text-ink-0">{c.name}</h3>
                    <span className={cn(
                      "inline-flex items-center h-6 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 text-[10px] font-medium uppercase tracking-[0.14em]",
                      c.status === "connected" ? "text-[color:var(--signal-success)]" :
                      c.status === "error" ? "text-[color:var(--signal-danger)]" :
                      c.status === "pending" ? "text-[color:var(--signal-warning)]" :
                      c.status === "expired" ? "text-[color:var(--signal-warning)]" :
                      "text-ink-5"
                    )}>
                      {c.status}
                    </span>
                  </div>
                  <p className="text-[12px] leading-[1.55] text-ink-5 mb-4">{c.description}</p>
                  <div className="border-t border-[color:var(--hairline)] pt-4 mt-4 text-[11px] text-ink-5 flex justify-between">
                     <span>Último sync: {c.lastSync ? new Date(c.lastSync).toLocaleDateString("es-AR") : "No registrado"}</span>
                     <span className={cn("font-medium uppercase tracking-[0.12em]", c.health === "operational" ? "text-[color:var(--signal-success)]" : "text-[color:var(--signal-warning)]")}>{c.health}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
