"use client";

import { useEffect, useRef } from "react";
import { BookOpen, Copy, ExternalLink, Mail, MessageSquare, RefreshCw, X } from "lucide-react";

import type { Ticket, HelpArticle, Guide, SupportActivity, ContactChannel } from "@/types/support";
import {
  SupportTicketStatusBadge,
  SupportPriorityBadge,
  SupportArticleStatusBadge,
  SupportSeverityBadge,
} from "@/components/admin/support/SupportBadge";

type DrawerContent =
  | { kind: "ticket"; data: Ticket }
  | { kind: "article"; data: HelpArticle }
  | { kind: "guide"; data: Guide }
  | { kind: "activity"; data: SupportActivity }
  | { kind: "contact"; data: ContactChannel };

interface SupportDrawerProps {
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

const dateFormatter = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function SupportDrawer({ content, isOpen, onClose, onAction }: SupportDrawerProps) {
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
        aria-labelledby="support-drawer-title"
        aria-modal="true"
        className="fixed inset-y-0 right-0 z-50 flex w-full flex-col overflow-y-auto border-l border-[#EAEAEA] bg-white shadow-2xl outline-none animate-in slide-in-from-right-5 duration-300 sm:max-w-xl"
        role="dialog"
        tabIndex={-1}
      >
        <div className="sticky top-0 z-20 border-b border-[#EAEAEA] bg-white/90 px-6 py-5 backdrop-blur-xl sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-3">
              <h2 id="support-drawer-title" className="truncate text-xl font-extrabold tracking-tight text-[#111111]">
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
          {content.kind === "ticket" ? <TicketDetail data={content.data} onAction={onAction} /> : null}
          {content.kind === "article" ? <ArticleDetail data={content.data} onAction={onAction} /> : null}
          {content.kind === "guide" ? <GuideDetail data={content.data} onAction={onAction} /> : null}
          {content.kind === "activity" ? <ActivityDetail data={content.data} onAction={onAction} /> : null}
          {content.kind === "contact" ? <ContactDetail data={content.data} onAction={onAction} /> : null}
        </div>
      </div>
    </>
  );
}

function getTitle(c: DrawerContent): string {
  switch (c.kind) {
    case "ticket": return c.data.subject;
    case "article": return c.data.title;
    case "guide": return c.data.title;
    case "activity": return c.data.description;
    case "contact": return c.data.name;
  }
}

function getBadges(c: DrawerContent) {
  switch (c.kind) {
    case "ticket": return <><SupportTicketStatusBadge status={c.data.status} /><SupportPriorityBadge priority={c.data.priority} /></>;
    case "article": return <SupportArticleStatusBadge status={c.data.status} />;
    case "guide": return <span className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-gray-600">{c.data.status === "published" ? "Publicada" : "Borrador"}</span>;
    case "activity": return <SupportSeverityBadge severity={c.data.severity} />;
    case "contact": return null;
  }
}

/* ─── Details ─── */

function TicketDetail({ data, onAction }: { data: Ticket; onAction: (a: string) => void }) {
  return (
    <>
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 border-b border-[#EAEAEA] pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Detalle del ticket</h3>
        <div className="space-y-3">
          <InfoRow label="ID de Ticket" value={<span className="font-mono text-xs text-gray-500">{data.id}</span>} />
          <InfoRow label="Categoría" value={data.category} />
          <InfoRow label="Fecha de creacion" value={dateFormatter.format(new Date(data.createdAt))} />
          <InfoRow label="Ultima actualizacion" value={dateFormatter.format(new Date(data.updatedAt))} />
        </div>
      </section>
      <section className="flex flex-wrap gap-2">
        {data.status !== "closed" && data.status !== "resolved" ? <DrawerAction icon={<MessageSquare className="h-3.5 w-3.5" />} label="Responder" onClick={() => onAction(`Respondiendo a ticket ${data.id} (mock)`)} primary /> : null}
        {data.status === "closed" || data.status === "resolved" ? <DrawerAction icon={<RefreshCw className="h-3.5 w-3.5" />} label="Reabrir" onClick={() => onAction(`Ticket ${data.id} reabierto (mock)`)} primary /> : null}
        {data.status !== "closed" && data.status !== "resolved" ? <DrawerAction icon={<X className="h-3.5 w-3.5" />} label="Cerrar ticket" onClick={() => onAction(`Ticket ${data.id} cerrado (mock)`)} /> : null}
        <DrawerAction icon={<Copy className="h-3.5 w-3.5" />} label="Copiar ID" onClick={() => onAction(`ID copiado: ${data.id}`)} />
      </section>
    </>
  );
}

function ArticleDetail({ data, onAction }: { data: HelpArticle; onAction: (a: string) => void }) {
  return (
    <>
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 border-b border-[#EAEAEA] pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Articulo del centro de ayuda</h3>
        <div className="space-y-3">
          <InfoRow label="ID" value={<span className="font-mono text-xs text-gray-500">{data.id}</span>} />
          <InfoRow label="Categoría" value={data.category} />
          <InfoRow label="Tiempo de lectura" value={data.readTime} />
          <InfoRow label="Ultima actualizacion" value={dateFormatter.format(new Date(data.lastUpdated))} />
        </div>
      </section>
      <section className="flex flex-wrap gap-2">
        <DrawerAction icon={<ExternalLink className="h-3.5 w-3.5" />} label="Leer articulo" onClick={() => onAction(`Leyendo articulo ${data.id} (mock)`)} primary />
        <DrawerAction icon={<Copy className="h-3.5 w-3.5" />} label="Copiar link" onClick={() => onAction(`Enlace copiado para ${data.id}`)} />
      </section>
    </>
  );
}

function GuideDetail({ data, onAction }: { data: Guide; onAction: (a: string) => void }) {
  const levelLabels: Record<string, string> = { beginner: "Principiante", intermediate: "Intermedio", advanced: "Avanzado" };
  return (
    <>
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 border-b border-[#EAEAEA] pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Guia de Nexora</h3>
        <div className="space-y-3">
          <InfoRow label="ID" value={<span className="font-mono text-xs text-gray-500">{data.id}</span>} />
          <InfoRow label="Categoría" value={data.category} />
          <InfoRow label="Nivel" value={levelLabels[data.level]} />
          <InfoRow label="Duracion" value={data.duration} />
        </div>
      </section>
      <section className="flex flex-wrap gap-2">
        <DrawerAction icon={<BookOpen className="h-3.5 w-3.5" />} label="Comenzar guia" onClick={() => onAction(`Iniciando guia ${data.id} (mock)`)} primary />
      </section>
    </>
  );
}

function ActivityDetail({ data, onAction }: { data: SupportActivity; onAction: (a: string) => void }) {
  return (
    <>
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 border-b border-[#EAEAEA] pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Detalle de actividad</h3>
        <div className="space-y-3">
          <InfoRow label="ID del Evento" value={<span className="font-mono text-xs text-gray-500">{data.id}</span>} />
          <InfoRow label="Tipo" value={<span className="font-mono text-xs text-gray-500">{data.type}</span>} />
          <InfoRow label="Fecha y hora" value={dateFormatter.format(new Date(data.timestamp))} />
          <InfoRow label="Referencia" value={<span className="font-mono text-xs text-[#111111]">{data.referenceId}</span>} />
        </div>
      </section>
      <section className="flex flex-wrap gap-2">
        <DrawerAction icon={<ExternalLink className="h-3.5 w-3.5" />} label="Ver referencia" onClick={() => onAction(`Abriendo referencia ${data.referenceId} (mock)`)} primary />
      </section>
    </>
  );
}

function ContactDetail({ data, onAction }: { data: ContactChannel; onAction: (a: string) => void }) {
  return (
    <>
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 border-b border-[#EAEAEA] pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Canal de contacto</h3>
        <div className="space-y-3">
          <InfoRow label="Descripcion" value={data.description} />
          <InfoRow label="Disponibilidad" value={data.availability} />
          <InfoRow label="SLA de Respuesta" value={data.sla} />
          <InfoRow label="Contacto" value={<span className="font-medium text-[#111111]">{data.value}</span>} />
        </div>
      </section>
      <section className="flex flex-wrap gap-2">
        {data.type === "chat" ? <DrawerAction icon={<MessageSquare className="h-3.5 w-3.5" />} label="Iniciar chat" onClick={() => onAction("Iniciando chat (mock)")} primary /> : null}
        {data.type === "email" ? <DrawerAction icon={<Mail className="h-3.5 w-3.5" />} label="Enviar correo" onClick={() => onAction(`Borrador preparado para ${data.value} (mock)`)} primary /> : null}
        <DrawerAction icon={<Copy className="h-3.5 w-3.5" />} label="Copiar informacion" onClick={() => onAction(`Copiado: ${data.value}`)} />
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
