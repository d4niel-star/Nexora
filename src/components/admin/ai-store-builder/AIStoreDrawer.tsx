"use client";

import { useEffect, useRef } from "react";
import { ChevronRight, X, Sparkles } from "lucide-react";

import type { AIProposal } from "@/types/ai-store-builder";
import { AIStyleBadge } from "@/components/admin/ai-store-builder/AIStoreBadge";

// ─── AI Store Drawer ───
// Same shell pattern as admin ProductDrawer/OrderDrawer: ink backdrop,
// hairline panel, sticky header, monochrome sections. No emerald focus
// rings, no shadow-2xl, no glass washes.

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
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
        {label}
      </p>
      <div className="text-[13px] text-ink-0 leading-[1.55]">{value}</div>
    </div>
  );
}

export function AIStoreDrawer({
  content,
  isOpen,
  onClose,
}: AIStoreDrawerProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "unset";
      return;
    }
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !content) return null;

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-40 bg-ink-0/40 transition-opacity duration-[var(--dur-base)] ease-[var(--ease-out)]"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        aria-labelledby="ai-drawer-title"
        aria-modal="true"
        className="fixed inset-y-0 right-0 z-50 flex w-full flex-col overflow-y-auto border-l border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-overlay)] outline-none animate-in slide-in-from-right-5 duration-[var(--dur-slow)] sm:max-w-xl"
        role="dialog"
        tabIndex={-1}
      >
        <div className="sticky top-0 z-20 border-b border-[color:var(--hairline)] bg-[var(--surface-0)]/95 px-6 py-5 backdrop-blur-xl sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-3">
              <h2
                id="ai-drawer-title"
                className="truncate text-[18px] font-semibold tracking-[-0.02em] text-ink-0"
              >
                {getTitle(content)}
              </h2>
              <div className="flex flex-wrap gap-1.5">{getBadges(content)}</div>
            </div>
            <button
              aria-label="Cerrar drawer"
              className="shrink-0 rounded-[var(--r-sm)] p-2 text-ink-5 transition-colors hover:bg-[var(--surface-2)] hover:text-ink-0 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
              onClick={onClose}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-8 p-6 sm:p-8">
          {content.kind === "proposal" ? (
            <ProposalDetail data={content.data} />
          ) : null}
          {content.kind === "block" ? <BlockDetail data={content.data} /> : null}
          {content.kind === "publish_check" ? (
            <PublishCheckDetail data={content.data} />
          ) : null}
        </div>
      </div>
    </>
  );
}

function getTitle(c: DrawerContent): string {
  switch (c.kind) {
    case "proposal":
      return c.data.name;
    case "block":
      return c.data.label;
    case "publish_check":
      return `Verificar: ${c.data.item}`;
  }
}

function getBadges(c: DrawerContent) {
  switch (c.kind) {
    case "proposal":
      return <AIStyleBadge style={c.data.styleCategory} />;
    case "block":
      return (
        <span className="inline-flex items-center h-6 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">
          {c.data.type}
        </span>
      );
    case "publish_check":
      return c.data.status ? (
        <span className="inline-flex items-center h-6 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[color:var(--signal-success)]">
          Completado
        </span>
      ) : (
        <span className="inline-flex items-center h-6 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[color:var(--signal-warning)]">
          Pendiente
        </span>
      );
  }
}

/* ─── Details ─── */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 border-b border-[color:var(--hairline)] pb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-5">
      {children}
    </h3>
  );
}

function ProposalDetail({ data }: { data: AIProposal }) {
  return (
    <>
      <section className="space-y-4">
        <SectionHeading>Detalles de generación IA</SectionHeading>
        <p className="text-[13px] leading-[1.55] text-ink-4">{data.shortSummary}</p>
        <div className="mt-4 space-y-4">
          <InfoRow label="Hero sugerido" value={`"${data.suggestedHeroText}"`} />
          <InfoRow label="Tono de copy" value={data.copyTone} />
          <InfoRow label="Estructura layout" value={data.layoutStyle} />
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading>Fortalezas</SectionHeading>
        <ul className="space-y-2">
          {data.strengths.map((str, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 text-[13px] text-ink-3 leading-[1.55]"
            >
              <Sparkles
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-5"
                strokeWidth={1.75}
              />
              {str}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <SectionHeading>Homepage structure</SectionHeading>
        <div className="flex flex-col gap-1.5 border-l border-[color:var(--hairline-strong)] pl-4">
          {data.homepageStructure.map((block, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 text-[13px] text-ink-5"
            >
              <ChevronRight
                className="h-3.5 w-3.5 shrink-0 text-ink-6"
                strokeWidth={1.75}
              />
              {block}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function BlockDetail({
  data,
}: {
  data: { label: string; description: string; type: string };
}) {
  return (
    <section className="space-y-4">
      <SectionHeading>Detalle de bloque IA</SectionHeading>
      <div className="space-y-3">
        <InfoRow label="Rol en la página" value={data.description} />
      </div>
    </section>
  );
}

function PublishCheckDetail({
  data,
}: {
  data: { item: string; status: boolean; detail: string };
}) {
  return (
    <section className="space-y-4">
      <SectionHeading>Observación de readiness</SectionHeading>
      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-4">
        <p className="text-[13px] leading-[1.55] text-ink-4">{data.detail}</p>
      </div>
    </section>
  );
}
