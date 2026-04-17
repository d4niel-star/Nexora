"use client";

import { useMemo, useState } from "react";
import { Search, Globe, CreditCard, Plug, Radio, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UnifiedConnection } from "@/lib/integrations/queries";
import type { HealthCenterData } from "@/types/health";
import { HealthCenter } from "./HealthCenter";

type TabValue = "all" | "channels" | "payments" | "providers" | "ads" | "health";

export function IntegrationsClient({ initialData, healthData }: { initialData: UnifiedConnection[]; healthData: HealthCenterData }) {
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const tabCounts = useMemo(() => ({
    all: initialData.length,
    channels: initialData.filter(c => c.type === "channel").length,
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
        : activeTab === "channels" ? c.type === "channel"
        : activeTab === "payments" ? c.type === "payment"
        : activeTab === "providers" ? c.type === "provider"
        : activeTab === "ads" ? c.type === "ad_platform"
        : false;
      return matchesSearch && matchesTab;
    });
  }, [searchQuery, activeTab, initialData]);

  const tabs: Array<{ label: string; value: TabValue; count: number; icon: React.ReactNode }> = [
    { label: "Todas", value: "all", count: tabCounts.all, icon: <Radio className="h-3.5 w-3.5" /> },
    { label: "Canales", value: "channels", count: tabCounts.channels, icon: <Globe className="h-3.5 w-3.5" /> },
    { label: "Publicidad", value: "ads", count: tabCounts.ads, icon: <Radio className="h-3.5 w-3.5" /> },
    { label: "Pagos", value: "payments", count: tabCounts.payments, icon: <CreditCard className="h-3.5 w-3.5" /> },
    { label: "Proveedores", value: "providers", count: tabCounts.providers, icon: <Plug className="h-3.5 w-3.5" /> },
    { label: "Salud", value: "health", count: healthData.signals.length, icon: <ShieldCheck className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="animate-in fade-in space-y-8 pb-32 duration-700">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#111111]">Integraciones</h1>
          <p className="mt-1 text-[15px] font-medium text-[#666666]">Conexiones activas de la tienda a servicios externos.</p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-sm">
        <div className="flex items-center gap-8 overflow-x-auto border-b border-[#EAEAEA] bg-[#FAFAFA]/50 px-6 no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              className={cn("group relative whitespace-nowrap py-4 text-[13px] font-bold transition-colors", activeTab === tab.value ? "text-[#111111]" : "text-[#888888] hover:text-[#111111]")}
              onClick={() => setActiveTab(tab.value)}
            >
              <span className="flex items-center gap-2">
                {tab.icon}
                {tab.label}
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.18em]", activeTab === tab.value ? "bg-gray-200 text-[#111111]" : "bg-gray-100 text-gray-500 group-hover:bg-gray-200")}>{tab.count}</span>
              </span>
              {activeTab === tab.value ? <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-t-full bg-[#111111]" /> : null}
            </button>
          ))}
        </div>

        <div className="p-4 border-b border-[#EAEAEA] bg-white">
          <div className="relative w-full md:max-w-md group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
            <input
              type="text"
              placeholder="Buscar integración..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-[13px] font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="min-h-[400px] bg-[#FAFAFA]/30 p-6">
          {activeTab === "health" ? (
            <HealthCenter data={healthData} />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-50 border border-gray-100 shadow-sm">
                <Plug className="h-8 w-8 text-gray-300" />
              </div>
              <h3 className="text-xl font-extrabold text-[#111111]">No hay conexiones</h3>
              <p className="mt-2 text-[15px] font-medium text-[#888888]">No se encontraron integraciones reales instaladas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(c => (
                <div key={c.id} className="rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-[#111111]">{c.name}</h3>
                    <span className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.18em]",
                      c.status === "connected" ? "bg-emerald-50 text-emerald-700" :
                      c.status === "error" ? "bg-red-50 text-red-700" :
                      c.status === "pending" ? "bg-amber-50 text-amber-700" :
                      c.status === "expired" ? "bg-orange-50 text-orange-700" :
                      "bg-gray-100 text-gray-600"
                    )}>
                      {c.status}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-gray-500 mb-4">{c.description}</p>
                  <div className="border-t border-[#EAEAEA] pt-4 mt-4 text-[11px] font-medium text-gray-500 flex justify-between">
                     <span>Último sync: {c.lastSync ? new Date(c.lastSync).toLocaleDateString("es-AR") : "No registrado"}</span>
                     <span className={c.health === "operational" ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>{c.health.toUpperCase()}</span>
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
