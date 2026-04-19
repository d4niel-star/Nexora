"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, FileWarning, PackageCheck, AlertTriangle, ArrowRight, X, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { dismissRecommendation, promoteToDraft, archiveDraft } from "@/app/admin/ai/actions";

export interface WorkItem {
  type: "recommendation" | "draft" | "operations" | "catalog";
  id: string;
  title: string;
  description: string;
  meta: string;
  priority: "high" | "medium" | "low" | "action" | "review";
  href: string;
  recoId?: string;
  budgetLabel?: string;
  draftId?: string;
  scoreLabel?: string;
}

interface WorkQueueProps {
  items: WorkItem[];
}

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-[var(--surface-2)] text-[color:var(--signal-danger)]",
  medium: "bg-[var(--surface-2)] text-[color:var(--signal-warning)]",
  low: "bg-[var(--surface-2)] text-ink-5",
  action: "bg-[var(--surface-2)] text-accent-500",
  review: "bg-[var(--surface-2)] text-[color:var(--signal-danger)]",
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "Prioridad Alta",
  medium: "Media",
  low: "Baja",
  action: "Acción",
  review: "Revisar",
};

const TYPE_CONFIG = {
  recommendation: { icon: Megaphone, color: "text-[color:var(--signal-success)]", borderHover: "hover:border-[color:var(--hairline-strong)]", label: "Ads" },
  draft: { icon: FileWarning, color: "text-[color:var(--signal-warning)]", borderHover: "hover:border-[color:var(--hairline-strong)]", label: "Borrador" },
  operations: { icon: PackageCheck, color: "text-accent-500", borderHover: "hover:border-[color:var(--hairline-strong)]", label: "Operaciones" },
  catalog: { icon: AlertTriangle, color: "text-[color:var(--signal-danger)]", borderHover: "hover:border-[color:var(--hairline-strong)]", label: "Calidad" },
};

export function WorkQueue({ items: initialItems }: WorkQueueProps) {
  const [items, setItems] = useState(initialItems);
  const [isPending, startTransition] = useTransition();
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [resolvedItems, setResolvedItems] = useState<Map<string, string>>(new Map()); // id → label
  const router = useRouter();

  const resolveItem = (itemId: string, label: string) => {
    setResolvedItems(prev => new Map(prev).set(itemId, label));
    setActioningId(null);
    setTimeout(() => {
      setItems(prev => prev.filter(i => i.id !== itemId));
      // After removing, router.refresh() ensures server data sync on next navigation
    }, 800);
  };

  const handleDismissReco = (recoId: string, itemId: string) => {
    setActioningId(itemId);
    startTransition(async () => {
      const result = await dismissRecommendation(recoId);
      if (result.success) {
        resolveItem(itemId, "Descartada");
      } else {
        setActioningId(null);
      }
    });
  };

  const handlePromoteReco = (recoId: string, itemId: string) => {
    setActioningId(itemId);
    startTransition(async () => {
      const result = await promoteToDraft(recoId);
      if (result.success) {
        resolveItem(itemId, "Borrador creado");
      } else {
        setActioningId(null);
      }
    });
  };

  const handleArchiveDraft = (draftId: string, itemId: string) => {
    setActioningId(itemId);
    startTransition(async () => {
      const result = await archiveDraft(draftId);
      if (result.success) {
        resolveItem(itemId, "Archivado");
      } else {
        setActioningId(null);
      }
    });
  };

  if (items.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[11px] font-medium uppercase tracking-widest text-ink-0">
          Trabajo Pendiente
          <span className="ml-2 bg-ink-0 text-ink-12 text-[10px] px-2 py-0.5 rounded-[var(--r-xs)] font-semibold">{items.length - resolvedItems.size}</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((item) => {
          const config = TYPE_CONFIG[item.type];
          const Icon = config.icon;
          const isActioning = actioningId === item.id;
          const resolvedLabel = resolvedItems.get(item.id);
          const isResolved = !!resolvedLabel;

          return (
            <div
              key={item.id}
              className={`rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5 shadow-[var(--shadow-soft)] transition-all duration-300 h-full flex flex-col relative overflow-hidden ${
                isResolved ? "opacity-0 scale-95 pointer-events-none" : config.borderHover
              }`}
            >
              {/* Resolved overlay */}
              {isResolved && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--surface-0)]/90 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-[color:var(--signal-success)]">
                    <Check className="w-5 h-5" />
                    <span className="text-[13px] font-semibold">{resolvedLabel}</span>
                  </div>
                </div>
              )}

              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${config.color}`} />
                  <span className={`text-[10px] font-medium uppercase tracking-wider ${config.color}`}>{config.label}</span>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-[var(--r-xs)] uppercase tracking-wider ${PRIORITY_STYLES[item.priority]}`}>
                  {PRIORITY_LABELS[item.priority]}
                </span>
              </div>

              {/* Content */}
              <h3 className="text-[15px] font-semibold text-ink-0 leading-snug mb-2">{item.title}</h3>
              <p className="text-[12px] text-ink-5 leading-relaxed flex-1 line-clamp-2">{item.description}</p>

              {/* Footer: Actions */}
              <div className="mt-4 pt-3 border-t border-[color:var(--hairline)]">
                {item.type === "recommendation" && item.recoId && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-ink-6 truncate">{item.budgetLabel}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleDismissReco(item.recoId!, item.id)}
                        disabled={isActioning || isPending}
                        className="px-2.5 py-1 text-[11px] font-semibold text-ink-5 hover:text-[color:var(--signal-danger)] hover:bg-[var(--surface-2)] rounded-[var(--r-sm)] transition-colors disabled:opacity-50 flex items-center gap-0.5"
                      >
                        {isActioning ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                        Descartar
                      </button>
                      <button
                        onClick={() => handlePromoteReco(item.recoId!, item.id)}
                        disabled={isActioning || isPending}
                        className="px-2.5 py-1 text-[11px] font-semibold text-ink-12 bg-ink-0 hover:bg-ink-1 rounded-[var(--r-sm)] transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        {isActioning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        Crear Borrador
                      </button>
                    </div>
                  </div>
                )}

                {item.type === "draft" && item.draftId && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-ink-6">{item.scoreLabel}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleArchiveDraft(item.draftId!, item.id)}
                        disabled={isActioning || isPending}
                        className="px-2.5 py-1 text-[11px] font-semibold text-ink-5 hover:text-[color:var(--signal-danger)] hover:bg-[var(--surface-2)] rounded-[var(--r-sm)] transition-colors disabled:opacity-50 flex items-center gap-0.5"
                      >
                        {isActioning ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                        Archivar
                      </button>
                      <Link
                        href={item.href}
                        className="px-2.5 py-1 text-[11px] font-semibold text-ink-12 bg-ink-0 hover:bg-ink-1 rounded-[var(--r-sm)] transition-colors flex items-center gap-1"
                      >
                        Continuar <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                )}

                {item.type === "operations" && (
                  <Link href={item.href} className="flex items-center justify-between group">
                    <span className="text-[11px] font-medium text-ink-6">{item.meta}</span>
                    <span className="text-[11px] font-semibold text-ink-0 group-hover:underline flex items-center gap-1">
                      Ver pedidos <ArrowRight className="w-3 h-3" />
                    </span>
                  </Link>
                )}

                {item.type === "catalog" && (
                  <Link href={item.href} className="flex items-center justify-between group">
                    <span className="text-[11px] font-medium text-ink-6">{item.meta}</span>
                    <span className="text-[11px] font-semibold text-[color:var(--signal-danger)] group-hover:underline flex items-center gap-1">
                      Completar datos <ArrowRight className="w-3 h-3" />
                    </span>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
