"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Box,
  CheckCircle2,
  CircleDollarSign,
  PackageSearch,
  ShoppingCart,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { OperationalItem, OperationsCenterData, OpCategory, OpSeverity } from "@/types/operations";

interface OperationsPageProps {
  data: OperationsCenterData;
}

export function OperationsPage({ data }: OperationsPageProps) {
  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#888888]">Centro operativo</p>
          <h1 className="mt-2 text-[28px] font-extrabold tracking-tight text-[#111111] leading-none">Operaciones</h1>
          <p className="mt-2 text-[13px] text-[#777777]">
            Prioridad diaria basada en pedidos, inventario, margen, sourcing y acciones de IA.
          </p>
        </div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#AAAAAA]">
          Actualizado {new Date(data.generatedAt).toLocaleString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        <KpiCard label="Pedidos a operar" value={data.kpis.ordersToProcess} />
        <KpiCard label="Alertas de stock" value={data.kpis.inventoryAlerts} />
        <KpiCard label="Productos sin costo" value={data.kpis.productsWithoutCost} />
      </section>

      <section className="rounded-xl border border-[#EAEAEA] bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#EAEAEA] px-5 py-4">
          <div>
            <h2 className="text-sm font-extrabold text-[#111111]">Cola de accion</h2>
            <p className="mt-1 text-xs font-medium text-[#888888]">Ordenada por severidad y lista para ejecutar desde cada modulo.</p>
          </div>
          <span className="rounded-full bg-[#F5F5F5] px-2.5 py-1 text-[11px] font-bold text-[#666666]">
            {data.items.length} alerta{data.items.length !== 1 ? "s" : ""}
          </span>
        </div>

        {data.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-extrabold text-[#111111]">Sin bloqueos operativos</h3>
            <p className="mt-2 max-w-sm text-[13px] font-medium text-[#888888]">
              No hay pedidos retenidos, alertas de inventario ni tareas criticas de sourcing en este momento.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#EAEAEA]">
            {data.items.map((item) => (
              <OperationRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[#EAEAEA] bg-white p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#999999]">{label}</p>
      <p className="mt-2 text-2xl font-black tabular-nums text-[#111111]">{value.toLocaleString("es-AR")}</p>
    </div>
  );
}

function OperationRow({ item }: { item: OperationalItem }) {
  const Icon = categoryIcon(item.category);

  return (
    <Link
      href={item.href}
      className="group flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-[#FAFAFA] md:flex-row md:items-center md:justify-between"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", severityTone(item.severity))}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-extrabold text-[#111111]">{item.title}</h3>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", severityBadge(item.severity))}>
              {severityLabel(item.severity)}
            </span>
          </div>
          <p className="mt-1 text-[13px] font-medium leading-5 text-[#777777]">{item.description}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-between gap-3 md:justify-end">
        {item.metric ? (
          <span className="rounded-md bg-[#F5F5F5] px-2.5 py-1 text-[11px] font-black tabular-nums text-[#555555]">
            {item.metric}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1 text-[12px] font-bold text-[#111111]">
          {item.actionLabel}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

function categoryIcon(category: OpCategory) {
  switch (category) {
    case "orders": return ShoppingCart;
    case "margin": return CircleDollarSign;
    case "catalog": return PackageSearch;
    case "inventory": return Box;
    case "sourcing": return PackageSearch;
    case "ai": return Sparkles;
    default: return AlertTriangle;
  }
}

function severityTone(severity: OpSeverity): string {
  switch (severity) {
    case "critical": return "bg-red-50 text-red-600";
    case "high": return "bg-amber-50 text-amber-700";
    case "normal": return "bg-blue-50 text-blue-700";
    case "info": return "bg-[#F5F5F5] text-[#777777]";
  }
}

function severityBadge(severity: OpSeverity): string {
  switch (severity) {
    case "critical": return "bg-red-50 text-red-700";
    case "high": return "bg-amber-50 text-amber-700";
    case "normal": return "bg-blue-50 text-blue-700";
    case "info": return "bg-[#F5F5F5] text-[#777777]";
  }
}

function severityLabel(severity: OpSeverity): string {
  switch (severity) {
    case "critical": return "Critico";
    case "high": return "Alto";
    case "normal": return "Normal";
    case "info": return "Info";
  }
}
