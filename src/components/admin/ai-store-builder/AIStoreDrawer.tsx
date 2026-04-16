"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2, ChevronRight, Eye, ExternalLink, RefreshCw, X, Sparkles, LayoutPanelTop } from "lucide-react";

import type { AIProposal } from "@/types/ai-store-builder";
import { AIStyleBadge } from "@/components/admin/ai-store-builder/AIStoreBadge";

type DrawerContent =
  | { kind: "proposal"; data: AIProposal }
  | { kind: "block"; data: { label: string; description: string; type: string } }
  | { kind: "publish_check"; data: { item: string; status: boolean; detail: string } };

interface AIStoreDrawerProps {
  content: DrawerContent | null;
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: string) => void;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">{label}</p>
      <div className="text-sm font-medium text-[#111111]">{value}</div>
    </div>
  );
}

export function AIStoreDrawer({ content, isOpen, onClose, onAction }: AIStoreDrawerProps) {
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
        aria-labelledby="ai-drawer-title"
        aria-modal="true"
        className="fixed inset-y-0 right-0 z-50 flex w-full flex-col overflow-y-auto border-l border-[#EAEAEA] bg-white shadow-2xl outline-none animate-in slide-in-from-right-5 duration-300 sm:max-w-xl"
        role="dialog"
        tabIndex={-1}
      >
        <div className="sticky top-0 z-20 border-b border-[#EAEAEA] bg-white/90 px-6 py-5 backdrop-blur-xl sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-3">
              <h2 id="ai-drawer-title" className="truncate text-xl font-extrabold tracking-tight text-[#111111]">
                {getTitle(content)}
              </h2>
              <div className="flex flex-wrap gap-2">{getBadges(content)}</div>
            </div>
            <button aria-label="Cerrar drawer" className="shrink-0 rounded-full p-2.5 text-gray-400 transition-all hover:bg-gray-100 hover:text-[#111111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={onClose} type="button">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-8 p-6 sm:p-8">
          {content.kind === "proposal" ? <ProposalDetail data={content.data} onAction={onAction} /> : null}
          {content.kind === "block" ? <BlockDetail data={content.data} onAction={onAction} /> : null}
          {content.kind === "publish_check" ? <PublishCheckDetail data={content.data} onAction={onAction} /> : null}
        </div>
      </div>
    </>
  );
}

function getTitle(c: DrawerContent): string {
  switch (c.kind) {
    case "proposal": return c.data.name;
    case "block": return c.data.label;
    case "publish_check": return `Verificar: ${c.data.item}`;
  }
}

function getBadges(c: DrawerContent) {
  switch (c.kind) {
    case "proposal": return <AIStyleBadge style={c.data.styleCategory} />;
    case "block": return <span className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-gray-600">{c.data.type}</span>;
    case "publish_check": return c.data.status ? <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Completado</span> : <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">Pendiente</span>;
  }
}

/* ─── Details ─── */

function ProposalDetail({ data, onAction }: { data: AIProposal; onAction: (a: string) => void }) {
  return (
    <>
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 border-b border-[#EAEAEA] pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Detalles de generacion IA</h3>
        <p className="text-sm font-medium text-gray-600">{data.shortSummary}</p>
        <div className="mt-4 space-y-3">
          <InfoRow label="Hero sugerido" value={`"${data.suggestedHeroText}"`} />
          <InfoRow label="Tono de Copy" value={data.copyTone} />
          <InfoRow label="Estructura Layout" value={data.layoutStyle} />
        </div>
      </section>
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 border-b border-[#EAEAEA] pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Fortalezas</h3>
        <ul className="space-y-2">
          {data.strengths.map((str, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm font-medium text-[#111111]">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
              {str}
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 border-b border-[#EAEAEA] pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Homepage Structure</h3>
        <div className="flex flex-col gap-1.5 border-l-2 border-gray-100 pl-4">
          {data.homepageStructure.map((block, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm font-medium text-gray-500">
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300" />
              {block}
            </div>
          ))}
        </div>
      </section>

    </>
  );
}

function BlockDetail({ data, onAction }: { data: { label: string; description: string; type: string }; onAction: (a: string) => void }) {
  return (
    <>
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 border-b border-[#EAEAEA] pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Detalle de bloque IA</h3>
        <div className="space-y-3">
          <InfoRow label="Rol en la pagina" value={data.description} />
        </div>
      </section>

    </>
  );
}

function PublishCheckDetail({ data, onAction }: { data: { item: string; status: boolean; detail: string }; onAction: (a: string) => void }) {
  return (
    <>
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 border-b border-[#EAEAEA] pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Observacion de readiness</h3>
        <div className="rounded-xl border border-[#EAEAEA] bg-gray-50/50 p-4">
          <p className="text-sm font-medium text-gray-600">{data.detail}</p>
        </div>
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
