"use client";

import { ArrowDown, ArrowUp, Package, Minus } from "lucide-react";
import type { StockMovementRow } from "@/lib/store-engine/inventory/movement-queries";

interface Props {
  movements: StockMovementRow[];
  total: number;
}

const TYPE_BADGE_STYLES: Record<string, string> = {
  sale: "bg-[var(--surface-1)] text-ink-3",
  manual_adjustment: "bg-amber-500/10 text-amber-700",
  refund_restore: "bg-[var(--signal-warning)]/10 text-[color:var(--signal-warning)]",
  cancellation_restore: "bg-red-500/10 text-red-600",
  sourcing_import: "bg-emerald-500/10 text-emerald-700",
  sync_update: "bg-blue-500/10 text-blue-700",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function StockMovementTable({ movements, total }: Props) {
  if (movements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="w-8 h-8 text-ink-6 mb-3" />
        <p className="text-[14px] text-ink-5">No hay movimientos de stock registrados</p>
        <p className="text-[12px] text-ink-6 mt-1">Los movimientos aparecerán cuando se procesen ventas, ajustes o importaciones.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">
          Movimientos de stock
        </h3>
        <span className="text-[11px] text-ink-6">
          {total} total
        </span>
      </div>

      <div className="border border-[color:var(--hairline)] rounded-[var(--r-md)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[var(--surface-1)] border-b border-[color:var(--hairline)]">
                <th className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-5">Fecha</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-5">Producto</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-5">Tipo</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-5">Cambio</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-5 hidden sm:table-cell">Razón</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => {
                const badgeStyle = TYPE_BADGE_STYLES[m.type] ?? TYPE_BADGE_STYLES.sale;
                const DeltaIcon = m.quantityDelta > 0 ? ArrowUp : m.quantityDelta < 0 ? ArrowDown : Minus;
                const deltaColor = m.quantityDelta > 0 ? "text-emerald-600" : m.quantityDelta < 0 ? "text-red-500" : "text-ink-5";

                return (
                  <tr
                    key={m.id}
                    className="border-b border-[color:var(--hairline)] last:border-b-0 hover:bg-[var(--surface-1)] transition-colors"
                  >
                    <td className="px-4 py-3 text-ink-5 font-mono text-[11px] whitespace-nowrap" suppressHydrationWarning>
                      {formatDate(m.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-ink-0 font-medium text-[13px] truncate max-w-[200px]">
                          {m.product.title}
                        </p>
                        {m.variant.title !== "Default" && (
                          <p className="text-ink-6 text-[11px] mt-0.5">{m.variant.title}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-[var(--r-xs)] text-[11px] font-medium ${badgeStyle}`}>
                        {m.typeLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center gap-1 font-mono font-semibold text-[13px] ${deltaColor}`}>
                        <DeltaIcon className="w-3 h-3" />
                        {m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-5 text-[12px] hidden sm:table-cell max-w-[200px] truncate">
                      {m.reason || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
