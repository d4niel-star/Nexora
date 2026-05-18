"use client";

// ─── Theme Preview Modal ─────────────────────────────────────────────────
// Non-destructive preview before applying a theme preset.
// Shows impact summary, token diffs, and confirmation CTA.

import { useMemo } from "react";
import { ArrowRight, Check, Minus, Palette, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildPreviewSummary, type ThemePreviewSummary } from "@/lib/store-engine/theme/registry";

interface ThemePreviewModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentPresetId: string | null;
  targetPresetId: string;
  isPending?: boolean;
}

export function ThemePreviewModal({
  open,
  onClose,
  onConfirm,
  currentPresetId,
  targetPresetId,
  isPending,
}: ThemePreviewModalProps) {
  const summary = useMemo(
    () => (open ? buildPreviewSummary(currentPresetId, targetPresetId) : null),
    [open, currentPresetId, targetPresetId],
  );

  if (!open || !summary) return null;

  const impactColors = {
    minimal: { bg: "bg-[color:var(--signal-success)]/10", text: "text-[color:var(--signal-success)]", label: "Impacto mínimo" },
    moderate: { bg: "bg-[color:var(--signal-warning)]/10", text: "text-[color:var(--signal-warning)]", label: "Impacto moderado" },
    significant: { bg: "bg-[color:var(--signal-danger)]/10", text: "text-[color:var(--signal-danger)]", label: "Impacto significativo" },
  };
  const impact = impactColors[summary.impactLevel];

  return (
    <>
      <div className="fixed inset-0 z-[9998] bg-ink-0/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-[9999] w-[480px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-overlay)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[color:var(--hairline)] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--r-md)] bg-[var(--surface-1)]">
              <Palette className="h-4 w-4 text-ink-3" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-ink-0">Vista previa: {summary.presetName}</h3>
              <p className="text-[11px] text-ink-5">{summary.changes.length} cambios detectados</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-5 hover:bg-[var(--surface-1)] hover:text-ink-0" aria-label="Cerrar">
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Impact Badge */}
        <div className="border-b border-[color:var(--hairline)] px-5 py-3">
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium", impact.bg, impact.text)}>
            {summary.impactLevel === "minimal" ? <Check className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {impact.label}
          </span>
        </div>

        {/* Changes List */}
        <div className="max-h-[300px] overflow-y-auto px-5 py-3">
          {summary.changes.length === 0 ? (
            <p className="py-4 text-center text-[12px] text-ink-5">No hay diferencias con la configuración actual.</p>
          ) : (
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-[color:var(--hairline)] text-left">
                  <th className="pb-2 font-medium text-ink-5">Token</th>
                  <th className="pb-2 font-medium text-ink-5">Actual</th>
                  <th className="pb-2 font-medium text-ink-5" />
                  <th className="pb-2 font-medium text-ink-5">Nuevo</th>
                </tr>
              </thead>
              <tbody>
                {summary.changes.map((change, i) => (
                  <tr key={i} className="border-b border-[color:var(--hairline)] last:border-b-0">
                    <td className="py-1.5">
                      <span className="font-medium text-ink-3">{change.category}</span>
                      <span className="text-ink-5"> · {change.label}</span>
                    </td>
                    <td className="py-1.5 tabular-nums text-ink-5">
                      {change.from.startsWith("#") ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="inline-block h-3 w-3 rounded-sm border border-[color:var(--hairline)]" style={{ background: change.from }} />
                          {change.from}
                        </span>
                      ) : (
                        change.from
                      )}
                    </td>
                    <td className="py-1.5 text-center text-ink-6"><ArrowRight className="inline h-3 w-3" /></td>
                    <td className="py-1.5 tabular-nums font-medium text-ink-0">
                      {change.to.startsWith("#") ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="inline-block h-3 w-3 rounded-sm border border-[color:var(--hairline)]" style={{ background: change.to }} />
                          {change.to}
                        </span>
                      ) : (
                        change.to
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-[color:var(--hairline)] px-5 py-4">
          <p className="text-[10px] text-ink-5">Podés revertir en cualquier momento.</p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="nx-action nx-action--ghost nx-action--sm">Cancelar</button>
            <button type="button" onClick={onConfirm} disabled={isPending} className="nx-action nx-action--primary nx-action--sm">
              {isPending ? "Aplicando…" : "Aplicar tema"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
