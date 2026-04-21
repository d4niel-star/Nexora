"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Layers,
  Monitor,
  Paintbrush,
  Pencil,
  Smartphone,
  Type,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { NexoraEditorChat } from "@/components/admin/store-ai/NexoraEditorChat";
import { saveStoreBranding, saveHomeBlocks } from "@/lib/store-engine/actions";
import type { AdminStoreInitialData, BlockType } from "@/types/store-engine";

// ─── Theme Editor Shell ─────────────────────────────────────────────────
// Full-screen editor: left sidebar + center preview + AI chat.
// Replaces the scattered Tema/Branding/Home/Preview tabs from Mi tienda.

type SidebarPanel = "identity" | "colors" | "typography" | "sections";

const BLOCK_LABELS: Record<string, string> = {
  hero: "Hero principal",
  featured_products: "Productos destacados",
  featured_categories: "Categorías",
  benefits: "Beneficios",
  testimonials: "Testimonios",
  faq: "Preguntas frecuentes",
  newsletter: "Newsletter",
};

export function ThemeEditorShell({
  initialData,
}: {
  initialData: AdminStoreInitialData | null;
}) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [activePanel, setActivePanel] = useState<SidebarPanel>("colors");
  const [previewKey, setPreviewKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const storeSlug = initialData?.store?.slug;
  const publicPath = storeSlug ? `/store/${storeSlug}` : "";

  // Build absolute URL with cache-buster to avoid stale 404s
  const previewSrc = typeof window !== "undefined" && publicPath
    ? `${window.location.origin}${publicPath}?_t=${previewKey}`
    : "";

  const refreshPreview = useCallback(() => {
    setPreviewKey((k) => k + 1);
  }, []);

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col overflow-hidden">
      {/* ── Top toolbar ─────────────────────────────────── */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[color:var(--hairline)] bg-[var(--surface-0)] px-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/store-ai"
            className="flex h-8 w-8 items-center justify-center rounded-[var(--r-sm)] text-ink-5 transition-colors hover:bg-[var(--surface-1)] hover:text-ink-0"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          </Link>
          <div className="h-4 w-px bg-[var(--hairline)]" />
          <p className="text-[13px] font-semibold tracking-[-0.01em] text-ink-0">
            Editor de tema
          </p>
          {initialData?.store.name && (
            <span className="text-[11px] text-ink-5">
              — {initialData.store.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Device toggle */}
          <div className="flex rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-0.5">
            <button
              type="button"
              onClick={() => setDevice("desktop")}
              className={cn(
                "rounded-[var(--r-xs)] px-2.5 py-1 transition-colors",
                device === "desktop"
                  ? "bg-[var(--surface-0)] text-ink-0 shadow-sm"
                  : "text-ink-5 hover:text-ink-0",
              )}
              aria-label="Desktop"
            >
              <Monitor className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => setDevice("mobile")}
              className={cn(
                "rounded-[var(--r-xs)] px-2.5 py-1 transition-colors",
                device === "mobile"
                  ? "bg-[var(--surface-0)] text-ink-0 shadow-sm"
                  : "text-ink-5 hover:text-ink-0",
              )}
              aria-label="Mobile"
            >
              <Smartphone className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </div>

          {publicPath && (
            <Link
              href={publicPath}
              target="_blank"
              className="inline-flex h-8 items-center gap-1.5 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-3 text-[11px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-1)]"
            >
              <Eye className="h-3 w-3" strokeWidth={1.75} />
              Ver tienda
            </Link>
          )}
        </div>
      </header>

      {/* ── Main area: sidebar + preview ─────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="flex w-[280px] shrink-0 flex-col border-r border-[color:var(--hairline)] bg-[var(--surface-0)] overflow-y-auto">
          <SidebarNav active={activePanel} onChange={setActivePanel} />
          <div className="flex-1 overflow-y-auto p-4">
            {activePanel === "colors" && initialData && (
              <ColorsPanel initialData={initialData} onSaved={refreshPreview} />
            )}
            {activePanel === "typography" && initialData && (
              <TypographyPanel initialData={initialData} onSaved={refreshPreview} />
            )}
            {activePanel === "identity" && initialData && (
              <IdentityPanel initialData={initialData} />
            )}
            {activePanel === "sections" && initialData && (
              <SectionsPanel initialData={initialData} onSaved={refreshPreview} />
            )}
          </div>
        </aside>

        {/* Preview */}
        <main className="relative flex flex-1 items-center justify-center bg-[var(--surface-1)] overflow-hidden">
          <div
            className={cn(
              "relative rounded-lg border border-[color:var(--hairline)] bg-white shadow-[var(--shadow-overlay)] overflow-hidden transition-all duration-300",
              device === "desktop"
                ? "w-full max-w-[1200px] h-full max-h-full"
                : "w-[375px] h-[700px]",
            )}
          >
            {previewSrc ? (
              <iframe
                key={previewKey}
                ref={iframeRef}
                src={previewSrc}
                className="h-full w-full border-0"
                title="Store preview"
                onError={() => setPreviewKey((k) => k + 1)}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <p className="text-[13px] text-ink-5">Configurá tu tienda para ver el preview.</p>
                {publicPath && (
                  <button
                    type="button"
                    onClick={refreshPreview}
                    className="text-[11px] font-medium text-ink-0 underline underline-offset-4"
                  >
                    Reintentar
                  </button>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── AI Chat (bottom-right, inside editor only) ──── */}
      <NexoraEditorChat onActionApplied={refreshPreview} />
    </div>
  );
}

// ─── Sidebar nav ─────────────────────────────────────────────────────────

const PANELS: { id: SidebarPanel; label: string; icon: React.ComponentType<any> }[] = [
  { id: "colors", label: "Colores", icon: Paintbrush },
  { id: "typography", label: "Tipografía", icon: Type },
  { id: "identity", label: "Identidad", icon: Layers },
  { id: "sections", label: "Secciones", icon: Pencil },
];

function SidebarNav({ active, onChange }: { active: SidebarPanel; onChange: (p: SidebarPanel) => void }) {
  return (
    <nav className="flex border-b border-[color:var(--hairline)] bg-[var(--surface-1)]">
      {PANELS.map((p) => {
        const Icon = p.icon;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-3 text-[9px] font-medium uppercase tracking-[0.1em] transition-colors",
              active === p.id
                ? "text-ink-0 bg-[var(--surface-0)]"
                : "text-ink-5 hover:text-ink-0 hover:bg-[var(--surface-0)]/50",
            )}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
            {p.label}
          </button>
        );
      })}
    </nav>
  );
}

// ─── Colors panel ────────────────────────────────────────────────────────

function ColorsPanel({ initialData, onSaved }: { initialData: AdminStoreInitialData; onSaved: () => void }) {
  const [primary, setPrimary] = useState(initialData.branding?.primaryColor ?? "#111111");
  const [secondary, setSecondary] = useState(initialData.branding?.secondaryColor ?? "#F4F4F5");
  const [isPending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      await saveStoreBranding({ primaryColor: primary, secondaryColor: secondary });
      onSaved();
    });
  };

  const inputCls = "w-full h-9 px-3 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] text-[12px] font-mono text-ink-0 outline-none focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)]";

  return (
    <div className="space-y-5">
      <PanelHeading title="Colores" description="Se aplican en todo el storefront." />
      <label className="block space-y-1.5">
        <span className="text-[11px] font-medium text-ink-5">Color principal</span>
        <div className="flex items-center gap-2">
          <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="h-9 w-10 shrink-0 cursor-pointer rounded-[var(--r-xs)] border border-[color:var(--hairline)] p-0.5" />
          <input className={inputCls} value={primary} onChange={(e) => setPrimary(e.target.value)} />
        </div>
      </label>
      <label className="block space-y-1.5">
        <span className="text-[11px] font-medium text-ink-5">Color secundario</span>
        <div className="flex items-center gap-2">
          <input type="color" value={secondary} onChange={(e) => setSecondary(e.target.value)} className="h-9 w-10 shrink-0 cursor-pointer rounded-[var(--r-xs)] border border-[color:var(--hairline)] p-0.5" />
          <input className={inputCls} value={secondary} onChange={(e) => setSecondary(e.target.value)} />
        </div>
      </label>
      <SaveButton isPending={isPending} onClick={save} />
    </div>
  );
}

// ─── Typography panel ────────────────────────────────────────────────────

const FONTS = ["Inter", "Roboto", "Outfit", "Montserrat", "Poppins", "DM Sans", "Space Grotesk", "Playfair Display", "Lora", "Source Sans 3"];
const BTN_STYLES = [
  { value: "rounded-sm", label: "Redondeado" },
  { value: "square", label: "Cuadrado" },
  { value: "pill", label: "Píldora" },
];

function TypographyPanel({ initialData, onSaved }: { initialData: AdminStoreInitialData; onSaved: () => void }) {
  const [font, setFont] = useState(initialData.branding?.fontFamily ?? "Inter");
  const [btnStyle, setBtnStyle] = useState(initialData.branding?.buttonStyle ?? "rounded-sm");
  const [isPending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      await saveStoreBranding({ fontFamily: font, buttonStyle: btnStyle });
      onSaved();
    });
  };

  return (
    <div className="space-y-5">
      <PanelHeading title="Tipografía" description="Fuente y estilo de botones." />
      <label className="block space-y-1.5">
        <span className="text-[11px] font-medium text-ink-5">Fuente</span>
        <select value={font} onChange={(e) => setFont(e.target.value)} className="w-full h-9 px-3 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] text-[12px] text-ink-0 outline-none">
          {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </label>
      <div className="space-y-1.5">
        <span className="text-[11px] font-medium text-ink-5">Botones</span>
        <div className="flex gap-1.5">
          {BTN_STYLES.map((s) => (
            <button key={s.value} type="button" onClick={() => setBtnStyle(s.value)} className={cn("flex-1 h-8 rounded-[var(--r-sm)] border text-[10px] font-medium transition-colors", btnStyle === s.value ? "border-ink-0 bg-ink-0 text-ink-12" : "border-[color:var(--hairline)] text-ink-5 hover:bg-[var(--surface-1)]")}>{s.label}</button>
          ))}
        </div>
      </div>
      <SaveButton isPending={isPending} onClick={save} />
    </div>
  );
}

// ─── Identity panel ──────────────────────────────────────────────────────

function IdentityPanel({ initialData }: { initialData: AdminStoreInitialData }) {
  return (
    <div className="space-y-5">
      <PanelHeading title="Identidad" description="Datos públicos de tu tienda." />
      <InfoRow label="Nombre" value={initialData.store.name} />
      <InfoRow label="Slug" value={initialData.store.slug} mono />
      <InfoRow label="Descripción" value={initialData.store.description ?? "Sin descripción"} />
      <InfoRow label="Logo" value={initialData.branding?.logoUrl ? "Configurado" : "Sin logo"} />
      <p className="text-[10px] text-ink-6 leading-[1.4]">
        Para editar estos datos, andá a Mi tienda → Branding.
      </p>
    </div>
  );
}

// ─── Sections panel ──────────────────────────────────────────────────────

function SectionsPanel({ initialData, onSaved }: { initialData: AdminStoreInitialData; onSaved: () => void }) {
  const blocks = initialData.homeBlocks.sort((a, b) => a.sortOrder - b.sortOrder);
  const [isPending, startTransition] = useTransition();

  const handleToggle = (blockId: string) => {
    startTransition(async () => {
      const updated = blocks.map((b) => ({
        blockType: b.blockType as BlockType,
        sortOrder: b.sortOrder,
        isVisible: b.id === blockId ? !b.isVisible : b.isVisible,
        settingsJson: JSON.stringify(b.settings),
        source: b.source,
        state: "published",
      }));
      await saveHomeBlocks(updated);
      onSaved();
    });
  };

  const handleMove = (blockId: string, dir: "up" | "down") => {
    const idx = blocks.findIndex((b) => b.id === blockId);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= blocks.length) return;
    startTransition(async () => {
      const reordered = blocks.map((b, i) => {
        let newOrder = b.sortOrder;
        if (i === idx) newOrder = blocks[swapIdx].sortOrder;
        if (i === swapIdx) newOrder = blocks[idx].sortOrder;
        return {
          blockType: b.blockType as BlockType,
          sortOrder: newOrder,
          isVisible: b.isVisible,
          settingsJson: JSON.stringify(b.settings),
          source: b.source,
          state: "published",
        };
      });
      await saveHomeBlocks(reordered);
      onSaved();
    });
  };

  return (
    <div className="space-y-4">
      <PanelHeading title="Secciones" description={`${blocks.length} bloques en el home.`} />
      <div className="space-y-1.5">
        {blocks.map((block, idx) => (
          <div
            key={block.id}
            className={cn(
              "flex items-center gap-2 rounded-[var(--r-sm)] border px-2.5 py-2 transition-colors",
              block.isVisible
                ? "border-[color:var(--hairline)] bg-[var(--surface-0)]"
                : "border-dashed border-[color:var(--hairline)] bg-[var(--surface-1)] opacity-60",
            )}
          >
            <div className="flex shrink-0 flex-col gap-0.5">
              <button type="button" disabled={idx === 0 || isPending} onClick={() => handleMove(block.id, "up")} className="text-ink-6 hover:text-ink-0 disabled:opacity-20" aria-label="Up">
                <ArrowUp className="h-2.5 w-2.5" strokeWidth={2} />
              </button>
              <button type="button" disabled={idx === blocks.length - 1 || isPending} onClick={() => handleMove(block.id, "down")} className="text-ink-6 hover:text-ink-0 disabled:opacity-20" aria-label="Down">
                <ArrowDown className="h-2.5 w-2.5" strokeWidth={2} />
              </button>
            </div>
            <p className="flex-1 truncate text-[11px] font-medium text-ink-0">
              {BLOCK_LABELS[block.blockType] ?? block.blockType}
            </p>
            <button type="button" onClick={() => handleToggle(block.id)} disabled={isPending} className="rounded p-1 text-ink-5 hover:text-ink-0">
              {block.isVisible ? <Eye className="h-3 w-3" strokeWidth={1.75} /> : <EyeOff className="h-3 w-3" strokeWidth={1.75} />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Shared ──────────────────────────────────────────────────────────────

function PanelHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h3 className="text-[13px] font-semibold tracking-[-0.01em] text-ink-0">{title}</h3>
      <p className="mt-0.5 text-[10px] text-ink-5">{description}</p>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-ink-6">{label}</p>
      <p className={cn("text-[12px] text-ink-0 truncate", mono && "font-mono")}>{value}</p>
    </div>
  );
}

function SaveButton({ isPending, onClick }: { isPending: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      className="w-full h-9 rounded-[var(--r-sm)] bg-ink-0 text-[11px] font-medium text-ink-12 transition-colors hover:bg-ink-2 disabled:opacity-50"
    >
      {isPending ? "Guardando…" : "Guardar cambios"}
    </button>
  );
}
