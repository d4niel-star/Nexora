"use client";

import { useEffect, useRef } from "react";
import { Copy, ExternalLink, Play, RefreshCw, X } from "lucide-react";

import type { Integration, IntegrationLog, IntegrationStatus } from "@/types/integrations";
import { StatusBadge, HealthBadge, LogSeverityBadge, LogStatusBadge, HealthDot } from "@/components/admin/integrations/IntegrationBadge";
import { MOCK_LOGS } from "@/lib/mocks/integrations";

const statusLabelMap: Record<IntegrationStatus, string> = {
  connected: "Conectado",
  pending: "Pendiente",
  disconnected: "Desconectado",
  error: "Error",
  verifying: "Verificando",
  syncing: "Sincronizando",
  paused: "Pausado",
};

type DrawerContent =
  | { kind: "integration"; data: Integration }
  | { kind: "log"; data: IntegrationLog };

interface IntegrationDrawerProps {
  content: DrawerContent | null;
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: string) => void;
}

function MetricCard({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`p-5 ${muted ? "bg-[#FAFAFA]" : "bg-white"}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{label}</p>
      <p className="mt-2 text-xl font-black tracking-tight text-[#111111]">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{label}</p>
      <div className="text-sm font-medium text-[#111111]">{value}</div>
    </div>
  );
}

const timeFormatter = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export function IntegrationDrawer({ content, isOpen, onClose, onAction }: IntegrationDrawerProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) { document.body.style.overflow = "unset"; return; }
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const handleEscape = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEscape);
    return () => { document.body.style.overflow = "unset"; window.removeEventListener("keydown", handleEscape); };
  }, [isOpen, onClose]);

  if (!isOpen || !content) return null;

  return (
    <>
      <div aria-hidden="true" className="fixed inset-0 z-40 bg-[#111111]/28 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panelRef}
        aria-labelledby="integration-drawer-title"
        aria-modal="true"
        className="fixed inset-y-0 right-0 z-50 flex w-full flex-col overflow-y-auto border-l border-[#EAEAEA] bg-white shadow-2xl outline-none animate-in slide-in-from-right-5 duration-300 sm:max-w-xl"
        role="dialog"
        tabIndex={-1}
      >
        <div className="sticky top-0 z-20 border-b border-[#EAEAEA] bg-white/90 px-6 py-5 backdrop-blur-xl sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-3">
              <h2 id="integration-drawer-title" className="truncate text-xl font-extrabold tracking-tight text-[#111111]">
                {content.kind === "integration" ? content.data.name : content.data.integrationName}
              </h2>
              <div className="flex flex-wrap gap-2">
                {content.kind === "integration" ? (
                  <>
                    <StatusBadge status={content.data.status} />
                    <HealthBadge health={content.data.health} />
                  </>
                ) : (
                  <>
                    <LogSeverityBadge severity={content.data.severity} />
                    <LogStatusBadge status={content.data.status} />
                  </>
                )}
              </div>
            </div>
            <button aria-label="Cerrar drawer" className="rounded-full p-2.5 text-gray-400 transition-all hover:bg-gray-100 hover:text-[#111111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={onClose} type="button">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-8 p-6 sm:p-8">
          {content.kind === "integration" ? (
            <IntegrationDetail integration={content.data} onAction={onAction} />
          ) : (
            <LogDetail log={content.data} onAction={onAction} />
          )}
        </div>
      </div>
    </>
  );
}

function IntegrationDetail({ integration, onAction }: { integration: Integration; onAction: (a: string) => void }) {
  const logs = MOCK_LOGS.filter((l) => l.integrationId === integration.id).slice(0, 4);

  return (
    <>
      <section className="grid grid-cols-2 gap-0 overflow-hidden rounded-2xl border border-[#EAEAEA] shadow-sm">
        <MetricCard label="Estado" value={statusLabelMap[integration.status]} />
        <MetricCard label="Salud" value={integration.health === "operational" ? "Operativo" : integration.health === "degraded" ? "Degradado" : "Critico"} muted />
        {integration.eventsToday !== null ? <MetricCard label="Eventos hoy" value={integration.eventsToday.toLocaleString("es-AR")} muted /> : <MetricCard label="Productos sync" value={integration.productsSynced?.toLocaleString("es-AR") ?? "—"} muted />}
        <MetricCard label="Incidencias" value={integration.recentIncidents.toString()} />
      </section>

      <section className="space-y-4">
        <h3 className="flex items-center gap-2 border-b border-[#EAEAEA] pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Detalles</h3>
        <div className="space-y-3">
          <InfoRow label="Descripcion" value={integration.description} />
          {integration.account ? <InfoRow label="Cuenta" value={integration.account} /> : null}
          <InfoRow label="Ultima sync" value={integration.lastSync ? timeFormatter.format(new Date(integration.lastSync)) : "Nunca"} />
          {integration.webhookStatus ? <InfoRow label="Estado webhook" value={<StatusBadge status={integration.webhookStatus} />} /> : null}
        </div>
      </section>

      {logs.length > 0 ? (
        <section className="space-y-4">
          <h3 className="flex items-center gap-2 border-b border-[#EAEAEA] pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Actividad reciente</h3>
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 rounded-xl border border-[#EAEAEA] bg-[#FAFAFA] p-3">
                <HealthDot health={log.severity === "error" || log.severity === "critical" ? "critical" : log.severity === "warning" ? "degraded" : "operational"} />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#111111]">{log.event}</p>
                  <p className="mt-0.5 text-[11px] text-gray-500">{timeFormatter.format(new Date(log.timestamp))}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="flex flex-wrap gap-2">
        {integration.status === "connected" || integration.status === "syncing" || integration.status === "verifying" ? (
          <>
            <DrawerAction icon={<RefreshCw className="h-3.5 w-3.5" />} label="Probar sync" onClick={() => onAction("Sync de prueba simulada")} />
            <DrawerAction icon={<Copy className="h-3.5 w-3.5" />} label="Copiar ID" onClick={() => onAction(`ID copiado: ${integration.id}`)} />
          </>
        ) : integration.status === "disconnected" || integration.status === "error" ? (
          <>
            <DrawerAction icon={<ExternalLink className="h-3.5 w-3.5" />} label="Reconectar" onClick={() => onAction("Reconexion simulada")} primary />
            <DrawerAction icon={<Copy className="h-3.5 w-3.5" />} label="Copiar ID" onClick={() => onAction(`ID copiado: ${integration.id}`)} />
          </>
        ) : integration.status === "paused" ? (
          <>
            <DrawerAction icon={<Play className="h-3.5 w-3.5" />} label="Reanudar" onClick={() => onAction("Integracion reanudada (mock)")} primary />
            <DrawerAction icon={<Copy className="h-3.5 w-3.5" />} label="Copiar ID" onClick={() => onAction(`ID copiado: ${integration.id}`)} />
          </>
        ) : (
          <DrawerAction icon={<Copy className="h-3.5 w-3.5" />} label="Copiar ID" onClick={() => onAction(`ID copiado: ${integration.id}`)} />
        )}
      </section>
    </>
  );
}

function LogDetail({ log, onAction }: { log: IntegrationLog; onAction: (a: string) => void }) {
  return (
    <>
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 border-b border-[#EAEAEA] pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Detalle del evento</h3>
        <div className="space-y-3">
          <InfoRow label="Evento" value={log.event} />
          <InfoRow label="Integracion" value={log.integrationName} />
          <InfoRow label="Detalle" value={log.details} />
          <InfoRow label="Referencia" value={log.reference ?? "—"} />
          <InfoRow label="Timestamp" value={timeFormatter.format(new Date(log.timestamp))} />
          <InfoRow label="Severidad" value={<LogSeverityBadge severity={log.severity} />} />
          <InfoRow label="Estado" value={<LogStatusBadge status={log.status} />} />
        </div>
      </section>
      <section className="flex flex-wrap gap-2">
        <DrawerAction icon={<Copy className="h-3.5 w-3.5" />} label="Copiar referencia" onClick={() => onAction(`Referencia copiada: ${log.reference}`)} />
        {log.status === "failed" ? <DrawerAction icon={<RefreshCw className="h-3.5 w-3.5" />} label="Reintentar" onClick={() => onAction("Reintento simulado")} primary /> : null}
      </section>
    </>
  );
}

function DrawerAction({ icon, label, onClick, primary = false }: { icon: React.ReactNode; label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      className={primary
        ? "flex items-center gap-2 rounded-xl bg-[#111111] px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
        : "flex items-center gap-2 rounded-xl border border-[#EAEAEA] bg-white px-4 py-2.5 text-[13px] font-bold text-[#111111] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
      }
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}
