"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Globe,
  Mail,
  Package,
  RefreshCw,
  ShieldAlert,
  Truck,
  XCircle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SubsystemStatus {
  status: "ok" | "warn" | "error";
  message: string;
  metric?: number;
}

interface RecentActivityItem {
  id: string;
  eventType: string;
  severity: string;
  source: string;
  message: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
}

interface HealthReport {
  status: "healthy" | "degraded" | "unhealthy";
  uptime: string;
  subsystems: {
    database: SubsystemStatus;
    orders: SubsystemStatus;
    payments: SubsystemStatus;
    emails: SubsystemStatus;
    logistics: SubsystemStatus;
  };
  recentActivity: RecentActivityItem[];
  recentErrors: RecentActivityItem[];
}

const timeFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const severityConfig: Record<string, { color: string; icon: typeof AlertTriangle }> = {
  info: { color: "text-blue-500 bg-blue-50 border-blue-100", icon: Activity },
  warn: { color: "text-amber-600 bg-amber-50 border-amber-100", icon: AlertTriangle },
  error: { color: "text-red-500 bg-red-50 border-red-100", icon: XCircle },
  critical: { color: "text-red-700 bg-red-100 border-red-200", icon: ShieldAlert },
};

const subsystemIcons: Record<string, typeof Database> = {
  database: Database,
  orders: Package,
  payments: Zap,
  emails: Mail,
  logistics: Truck,
};

export function SystemHealthPage() {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/system/health");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setReport(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const overallStatusConfig = {
    healthy: { label: "Operativo", color: "bg-emerald-500", textColor: "text-emerald-700", bgColor: "bg-emerald-50" },
    degraded: { label: "Degradado", color: "bg-amber-500", textColor: "text-amber-700", bgColor: "bg-amber-50" },
    unhealthy: { label: "Caído", color: "bg-red-500", textColor: "text-red-700", bgColor: "bg-red-50" },
  };

  return (
    <div className="animate-in fade-in space-y-8 pb-32 duration-700">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#111111]">
            Sistema & Actividad
          </h1>
          <p className="mt-1 text-[15px] font-medium text-[#666666]">
            Estado operativo, eventos recientes y diagnóstico del sistema.
          </p>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-[#111111] px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-black disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-bold text-red-700">Error cargando estado del sistema</p>
          <p className="mt-1 text-xs text-red-600">{error}</p>
        </div>
      )}

      {loading && !report ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : report ? (
        <>
          {/* Overall Status Banner */}
          <div className={cn(
            "rounded-2xl border p-6 shadow-sm",
            report.status === "healthy" ? "border-emerald-200 bg-emerald-50/50" :
            report.status === "degraded" ? "border-amber-200 bg-amber-50/50" :
            "border-red-200 bg-red-50/50"
          )}>
            <div className="flex items-center gap-4">
              <div className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl",
                overallStatusConfig[report.status].bgColor
              )}>
                {report.status === "healthy" ? (
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                ) : report.status === "degraded" ? (
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600" />
                )}
              </div>
              <div>
                <h2 className={cn("text-xl font-black", overallStatusConfig[report.status].textColor)}>
                  {overallStatusConfig[report.status].label}
                </h2>
                <p className="text-sm font-medium text-gray-500">
                  Uptime: {report.uptime}
                </p>
              </div>
            </div>
          </div>

          {/* Subsystems Grid */}
          <div>
            <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">
              Subsistemas
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {Object.entries(report.subsystems).map(([key, sub]) => {
                const Icon = subsystemIcons[key] || Globe;
                return (
                  <div
                    key={key}
                    className="rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg",
                        sub.status === "ok" ? "bg-emerald-50 text-emerald-600" :
                        sub.status === "warn" ? "bg-amber-50 text-amber-600" :
                        "bg-red-50 text-red-600"
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold capitalize text-[#111111]">
                          {key === "database" ? "Base de Datos" :
                           key === "orders" ? "Órdenes" :
                           key === "payments" ? "Pagos" :
                           key === "emails" ? "Emails" : "Logística"}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <div className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            sub.status === "ok" ? "bg-emerald-500" :
                            sub.status === "warn" ? "bg-amber-500" :
                            "bg-red-500"
                          )} />
                          <span className="text-[11px] font-medium text-gray-500">
                            {sub.status === "ok" ? "OK" : sub.status === "warn" ? "Alerta" : "Error"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-xs font-medium text-gray-500">
                      {sub.message}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Errors Section */}
          {report.recentErrors.length > 0 && (
            <div>
              <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-red-500">
                Errores Recientes
              </h3>
              <div className="space-y-2">
                {report.recentErrors.map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
              </div>
            </div>
          )}

          {/* Activity Feed */}
          <div>
            <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">
              Actividad Reciente
            </h3>
            {report.recentActivity.length === 0 ? (
              <div className="rounded-2xl border border-[#EAEAEA] bg-white p-10 text-center shadow-sm">
                <Clock className="mx-auto h-8 w-8 text-gray-300" />
                <p className="mt-3 text-sm font-bold text-gray-400">
                  Sin actividad registrada todavía
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {report.recentActivity.map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

function EventRow({ event }: { event: RecentActivityItem }) {
  const config = severityConfig[event.severity] || severityConfig.info;
  const Icon = config.icon;

  return (
    <div className={cn(
      "flex items-start gap-3 rounded-xl border bg-white p-4 shadow-sm transition-all",
      event.severity === "error" || event.severity === "critical"
        ? "border-red-100 hover:border-red-200"
        : "border-[#EAEAEA] hover:border-gray-300"
    )}>
      <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", config.color)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#111111]">{event.eventType}</span>
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">
            {event.source}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs font-medium text-gray-600">
          {event.message}
        </p>
        {event.entityId && (
          <p className="mt-0.5 truncate text-[10px] font-mono text-gray-400">
            {event.entityType}:{event.entityId}
          </p>
        )}
      </div>
      <span className="shrink-0 text-[10px] font-bold tabular-nums text-gray-400">
        {timeFormatter.format(new Date(event.createdAt))}
      </span>
    </div>
  );
}
