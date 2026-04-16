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
  high: "bg-red-50 text-red-600",
  medium: "bg-amber-50 text-amber-600",
  low: "bg-gray-50 text-gray-500",
  action: "bg-purple-50 text-purple-600",
  review: "bg-red-50 text-red-600",
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "Prioridad Alta",
  medium: "Media",
  low: "Baja",
  action: "Acción",
  review: "Revisar",
};

const TYPE_CONFIG = {
  recommendation: { icon: Megaphone, color: "text-emerald-600", borderHover: "hover:border-emerald-200", label: "Ads" },
  draft: { icon: FileWarning, color: "text-amber-500", borderHover: "hover:border-amber-200", label: "Borrador" },
  operations: { icon: PackageCheck, color: "text-purple-600", borderHover: "hover:border-purple-200", label: "Operaciones" },
  catalog: { icon: AlertTriangle, color: "text-red-500", borderHover: "hover:border-red-200", label: "Calidad" },
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
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#111111]">
          Trabajo Pendiente
          <span className="ml-2 bg-[#111111] text-white text-[10px] px-2 py-0.5 rounded-full">{items.length - resolvedItems.size}</span>
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
              className={`rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm transition-all duration-300 h-full flex flex-col relative overflow-hidden ${
                isResolved ? "opacity-0 scale-95 pointer-events-none" : config.borderHover
              }`}
            >
              {/* Resolved overlay */}
              {isResolved && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <Check className="w-5 h-5" />
                    <span className="text-[13px] font-bold">{resolvedLabel}</span>
                  </div>
                </div>
              )}

              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${config.color}`} />
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${config.color}`}>{config.label}</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${PRIORITY_STYLES[item.priority]}`}>
                  {PRIORITY_LABELS[item.priority]}
                </span>
              </div>

              {/* Content */}
              <h3 className="text-[15px] font-bold text-[#111111] leading-snug mb-2">{item.title}</h3>
              <p className="text-[12px] text-[#888888] leading-relaxed flex-1 line-clamp-2">{item.description}</p>

              {/* Footer: Actions */}
              <div className="mt-4 pt-3 border-t border-[#F0F0F0]">
                {item.type === "recommendation" && item.recoId && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-gray-400 truncate">{item.budgetLabel}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleDismissReco(item.recoId!, item.id)}
                        disabled={isActioning || isPending}
                        className="px-2.5 py-1 text-[11px] font-bold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-0.5"
                      >
                        {isActioning ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                        Descartar
                      </button>
                      <button
                        onClick={() => handlePromoteReco(item.recoId!, item.id)}
                        disabled={isActioning || isPending}
                        className="px-2.5 py-1 text-[11px] font-bold text-white bg-[#111111] hover:bg-black rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        {isActioning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        Crear Borrador
                      </button>
                    </div>
                  </div>
                )}

                {item.type === "draft" && item.draftId && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-gray-400">{item.scoreLabel}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleArchiveDraft(item.draftId!, item.id)}
                        disabled={isActioning || isPending}
                        className="px-2.5 py-1 text-[11px] font-bold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-0.5"
                      >
                        {isActioning ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                        Archivar
                      </button>
                      <Link
                        href={item.href}
                        className="px-2.5 py-1 text-[11px] font-bold text-white bg-[#111111] hover:bg-black rounded-lg transition-colors flex items-center gap-1"
                      >
                        Continuar <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                )}

                {item.type === "operations" && (
                  <Link href={item.href} className="flex items-center justify-between group">
                    <span className="text-[11px] font-bold text-gray-400">{item.meta}</span>
                    <span className="text-[11px] font-bold text-purple-600 group-hover:underline flex items-center gap-1">
                      Ver pedidos <ArrowRight className="w-3 h-3" />
                    </span>
                  </Link>
                )}

                {item.type === "catalog" && (
                  <Link href={item.href} className="flex items-center justify-between group">
                    <span className="text-[11px] font-bold text-gray-400">{item.meta}</span>
                    <span className="text-[11px] font-bold text-red-600 group-hover:underline flex items-center gap-1">
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
