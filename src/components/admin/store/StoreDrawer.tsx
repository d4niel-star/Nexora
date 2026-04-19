"use client";

import { useEffect, useRef } from "react";
import { Copy, Download, Eye, Pencil, Trash2, X } from "lucide-react";

import type { StoreTheme, HomeSection, NavItem, StorePage, StoreDomain } from "@/types/store";
import { StoreStatusBadge, SectionTypeBadge, PageTypeBadge, NavGroupBadge, ColorDot } from "@/components/admin/store/StoreBadge";

type DrawerContent =
  | { kind: "theme"; data: StoreTheme }
  | { kind: "section"; data: HomeSection }
  | { kind: "nav"; data: NavItem }
  | { kind: "page"; data: StorePage }
  | { kind: "domain"; data: StoreDomain };

interface StoreDrawerProps {
  content: DrawerContent | null;
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: string) => void;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">{label}</p>
      <div className="text-[13px] font-medium text-ink-0">{value}</div>
    </div>
  );
}

const sectionHeader = "flex items-center gap-2 border-b border-[color:var(--hairline)] pb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5";

const timeFormatter = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export function StoreDrawer({ content, isOpen, onClose, onAction }: StoreDrawerProps) {
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
      <div aria-hidden="true" className="fixed inset-0 z-40 bg-ink-0/40" onClick={onClose} />
      <div
        ref={panelRef}
        aria-labelledby="store-drawer-title"
        aria-modal="true"
        className="fixed inset-y-0 right-0 z-50 flex w-full flex-col overflow-y-auto border-l border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-overlay)] outline-none animate-in slide-in-from-right-5 duration-[var(--dur-slow)] sm:max-w-xl"
        role="dialog"
        tabIndex={-1}
      >
        <div className="sticky top-0 z-20 border-b border-[color:var(--hairline)] bg-[var(--surface-0)] px-6 py-5 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-3">
              <h2 id="store-drawer-title" className="truncate text-[18px] font-semibold tracking-[-0.02em] text-ink-0">
                {getTitle(content)}
              </h2>
              <div className="flex flex-wrap gap-2">{getBadges(content)}</div>
            </div>
            <button aria-label="Cerrar drawer" className="rounded-[var(--r-sm)] p-2 text-ink-5 transition-colors hover:bg-[var(--surface-2)] hover:text-ink-0 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]" onClick={onClose} type="button">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-8 p-6 sm:p-8">
          {content.kind === "theme" ? <ThemeDetail data={content.data} onAction={onAction} /> : null}
          {content.kind === "section" ? <SectionDetail data={content.data} onAction={onAction} /> : null}
          {content.kind === "nav" ? <NavDetail data={content.data} onAction={onAction} /> : null}
          {content.kind === "page" ? <PageDetail data={content.data} onAction={onAction} /> : null}
          {content.kind === "domain" ? <DomainDetail data={content.data} onAction={onAction} /> : null}
        </div>
      </div>
    </>
  );
}

function getTitle(c: DrawerContent): string {
  switch (c.kind) {
    case "theme": return c.data.name;
    case "section": return c.data.label;
    case "nav": return c.data.label;
    case "page": return c.data.name;
    case "domain": return "Configuracion de dominio";
  }
}

function getBadges(c: DrawerContent) {
  switch (c.kind) {
    case "theme": return <StoreStatusBadge status={c.data.status} />;
    case "section": return <><StoreStatusBadge status={c.data.status} /><SectionTypeBadge type={c.data.type} /></>;
    case "nav": return <><StoreStatusBadge status={c.data.status} /><NavGroupBadge group={c.data.group} /></>;
    case "page": return <><StoreStatusBadge status={c.data.status} /><PageTypeBadge type={c.data.type} /></>;
    case "domain": return <><StoreStatusBadge status={c.data.connection} /><StoreStatusBadge status={c.data.ssl} /></>;
  }
}

function ThemeDetail({ data, onAction }: { data: StoreTheme; onAction: (a: string) => void }) {
  return (
    <>
      <section className="space-y-4">
        <h3 className={sectionHeader}>Detalles del tema</h3>
        <div className="space-y-3">
          <InfoRow label="Descripcion" value={data.description} />
          <InfoRow label="Estilo" value={<SectionTypeBadge type={data.style} />} />
          <InfoRow label="Version" value={data.version} />
          <InfoRow label="Ultima modificacion" value={timeFormatter.format(new Date(data.lastModified))} />
          <InfoRow label="Colores" value={<div className="flex gap-2">{data.previewColors.map((c) => <ColorDot key={c} color={c} />)}</div>} />
        </div>
      </section>
      <section className="flex flex-wrap gap-2 text-[12px] text-ink-5">
        Gestión desde Nexora AI
      </section>
    </>
  );
}

function SectionDetail({ data, onAction }: { data: HomeSection; onAction: (a: string) => void }) {
  return (
    <>
      <section className="space-y-4">
        <h3 className={sectionHeader}>Detalle de seccion</h3>
        <div className="space-y-3">
          <InfoRow label="Tipo" value={<SectionTypeBadge type={data.type} />} />
          <InfoRow label="Descripcion" value={data.description} />
          <InfoRow label="Orden" value={`Posicion ${data.order}`} />
          <InfoRow label="Estado" value={<StoreStatusBadge status={data.status} />} />
        </div>
      </section>
      <section className="flex flex-wrap gap-2 text-[12px] text-ink-5">
        Gestión desde Nexora AI
      </section>
    </>
  );
}

function NavDetail({ data, onAction }: { data: NavItem; onAction: (a: string) => void }) {
  return (
    <>
      <section className="space-y-4">
        <h3 className={sectionHeader}>Detalle de navegacion</h3>
        <div className="space-y-3">
          <InfoRow label="Nombre" value={data.label} />
          <InfoRow label="Destino" value={<span className="break-all text-[11px] font-mono text-ink-5">{data.destination}</span>} />
          <InfoRow label="Grupo" value={<NavGroupBadge group={data.group} />} />
          <InfoRow label="Orden" value={`Posicion ${data.order}`} />
          <InfoRow label="Estado" value={<StoreStatusBadge status={data.status} />} />
        </div>
      </section>
      <section className="flex flex-wrap gap-2 text-[12px] text-ink-5">
        Gestión desde Nexora AI
      </section>
    </>
  );
}

function PageDetail({ data, onAction }: { data: StorePage; onAction: (a: string) => void }) {
  return (
    <>
      <section className="space-y-4">
        <h3 className={sectionHeader}>Detalle de pagina</h3>
        <div className="space-y-3">
          <InfoRow label="Nombre" value={data.name} />
          <InfoRow label="Slug" value={<span className="font-mono text-[11px] text-ink-5">{data.slug}</span>} />
          <InfoRow label="Tipo" value={<PageTypeBadge type={data.type} />} />
          <InfoRow label="Ultima modificacion" value={timeFormatter.format(new Date(data.lastModified))} />
          <InfoRow label="Estado" value={<StoreStatusBadge status={data.status} />} />
        </div>
      </section>
      <section className="flex flex-wrap gap-2 text-[12px] text-ink-5">
        Gestión desde Nexora AI
      </section>
    </>
  );
}

function DomainDetail({ data, onAction }: { data: StoreDomain; onAction: (a: string) => void }) {
  return (
    <>
      <section className="space-y-4">
        <h3 className={sectionHeader}>Detalle de dominio</h3>
        <div className="space-y-3">
          <InfoRow label="Subdominio Nexora" value={<span className="font-mono text-[11px] text-ink-5">{data.subdomain}</span>} />
          <InfoRow label="Dominio personalizado" value={<span className="font-mono text-[11px] text-ink-5">{data.customDomain}</span>} />
          <InfoRow label="SSL" value={<StoreStatusBadge status={data.ssl} />} />
          <InfoRow label="Conexion" value={<StoreStatusBadge status={data.connection} />} />
          <InfoRow label="Ultima verificacion" value={timeFormatter.format(new Date(data.lastVerified))} />
        </div>
      </section>
      <section className="flex flex-wrap gap-2">
        <DrawerAction icon={<Copy className="h-3.5 w-3.5" />} label="Copiar URL" onClick={() => onAction(`URL copiada: ${data.customDomain}`)} />
      </section>
    </>
  );
}

function DrawerAction({ icon, label, onClick, primary = false }: { icon: React.ReactNode; label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      className={primary
        ? "inline-flex items-center gap-2 h-10 px-5 rounded-[var(--r-sm)] bg-ink-0 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
        : "inline-flex items-center gap-2 h-10 px-4 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] text-[13px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
      }
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}
