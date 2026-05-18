"use client";

// ─── Structure Panel — Section hierarchy tree ────────────────────────────────

import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Home,
  Layers,
  LayoutGrid,
  Package,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EditorPage, EditorSelection, SectionBlock } from "../engine/types";
import { findSectionDef } from "../engine/section-library";

interface StructurePanelProps {
  blocks: SectionBlock[];
  selectedSection: EditorSelection;
  activePage: EditorPage;
  onSelectSection: (sel: EditorSelection) => void;
  onToggleVisibility: (id: string) => void;
  onMoveBlock: (id: string, direction: "up" | "down") => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  onAddSection: () => void;
  onPageChange: (page: EditorPage) => void;
}

const PAGE_DEFS: Array<{ id: EditorPage; label: string; icon: typeof Home }> = [
  { id: "home", label: "Inicio", icon: Home },
  { id: "listing", label: "Colección", icon: LayoutGrid },
  { id: "product", label: "Producto", icon: Package },
  { id: "cart", label: "Carrito", icon: ShoppingCart },
];

export function StructurePanel({
  blocks,
  selectedSection,
  activePage,
  onSelectSection,
  onToggleVisibility,
  onMoveBlock,
  onDuplicate,
  onRemove,
  onAddSection,
  onPageChange,
}: StructurePanelProps) {
  const sorted = [...blocks].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <aside className="flex w-[240px] shrink-0 flex-col border-r border-[color:var(--hairline)] bg-[var(--surface-0)]">
      {/* Pages */}
      <div className="border-b border-[color:var(--hairline)] p-2">
        <p className="px-2 pb-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-6">
          Páginas
        </p>
        {PAGE_DEFS.map((page) => {
          const Icon = page.icon;
          const active = activePage === page.id;
          return (
            <button
              key={page.id}
              type="button"
              onClick={() => onPageChange(page.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-[var(--r-sm)] px-2 py-1.5 text-[11px] font-medium transition-colors",
                active ? "bg-[var(--surface-1)] text-ink-0" : "text-ink-5 hover:text-ink-0",
              )}
            >
              <Icon className="h-3 w-3 shrink-0" strokeWidth={1.75} />
              {page.label}
            </button>
          );
        })}
      </div>

      {/* Sections tree */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="flex items-center justify-between px-2 pb-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-6">
            Secciones ({sorted.length})
          </p>
          <button
            type="button"
            onClick={onAddSection}
            className="flex h-5 w-5 items-center justify-center rounded-full text-ink-5 transition-colors hover:bg-[var(--surface-1)] hover:text-ink-0"
            aria-label="Agregar sección"
          >
            <Plus className="h-3 w-3" strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-0.5">
          {sorted.map((block, index) => {
            const def = findSectionDef(block.blockType);
            const Icon = def?.icon ?? Layers;
            const isSelected = selectedSection.sectionId === block.id;

            return (
              <div
                key={block.id}
                className={cn(
                  "group relative rounded-[var(--r-sm)] transition-colors",
                  isSelected
                    ? "bg-ink-0 text-ink-12"
                    : "hover:bg-[var(--surface-1)]",
                  !block.isVisible && !isSelected && "opacity-50",
                )}
              >
                {/* Main row */}
                <button
                  type="button"
                  onClick={() =>
                    onSelectSection({
                      sectionId: block.id,
                      sectionType: block.blockType,
                    })
                  }
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-left"
                >
                  <Icon
                    className={cn("h-3 w-3 shrink-0", isSelected ? "text-ink-9" : "text-ink-5")}
                    strokeWidth={1.75}
                  />
                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium">
                    {def?.label ?? block.blockType}
                  </span>
                  {!block.isVisible && (
                    <EyeOff className={cn("h-2.5 w-2.5 shrink-0", isSelected ? "text-ink-9" : "text-ink-6")} strokeWidth={1.75} />
                  )}
                </button>

                {/* Hover actions */}
                <div className={cn(
                  "absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 transition-opacity",
                  isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                )}>
                  <MiniBtn
                    icon={ChevronUp}
                    label="Mover arriba"
                    onClick={() => onMoveBlock(block.id, "up")}
                    disabled={index === 0}
                    light={isSelected}
                  />
                  <MiniBtn
                    icon={ChevronDown}
                    label="Mover abajo"
                    onClick={() => onMoveBlock(block.id, "down")}
                    disabled={index === sorted.length - 1}
                    light={isSelected}
                  />
                  <MiniBtn
                    icon={block.isVisible ? Eye : EyeOff}
                    label={block.isVisible ? "Ocultar" : "Mostrar"}
                    onClick={() => onToggleVisibility(block.id)}
                    light={isSelected}
                  />
                  <MiniBtn
                    icon={Copy}
                    label="Duplicar"
                    onClick={() => onDuplicate(block.id)}
                    light={isSelected}
                  />
                  <MiniBtn
                    icon={Trash2}
                    label="Eliminar"
                    onClick={() => onRemove(block.id)}
                    light={isSelected}
                    danger
                  />
                </div>
              </div>
            );
          })}
        </div>

        {sorted.length === 0 && (
          <div className="px-2 py-6 text-center">
            <p className="text-[11px] text-ink-5">Sin secciones</p>
            <button
              type="button"
              onClick={onAddSection}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[color:var(--hairline)] px-3 py-1.5 text-[10px] font-medium text-ink-0 hover:bg-[var(--surface-1)]"
            >
              <Plus className="h-3 w-3" /> Agregar
            </button>
          </div>
        )}
      </div>

      {/* Add section button */}
      <div className="border-t border-[color:var(--hairline)] p-2">
        <button
          type="button"
          onClick={onAddSection}
          className="flex h-8 w-full items-center justify-center gap-1.5 rounded-full border border-dashed border-[color:var(--hairline-strong)] text-[10px] font-medium text-ink-5 transition-colors hover:bg-[var(--surface-1)] hover:text-ink-0"
        >
          <Plus className="h-3 w-3" strokeWidth={2} />
          Agregar sección
        </button>
      </div>
    </aside>
  );
}

function MiniBtn({
  icon: Icon,
  label,
  onClick,
  disabled,
  light,
  danger,
}: {
  icon: typeof Eye;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  light?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-5 w-5 items-center justify-center rounded transition-colors disabled:opacity-30",
        light ? "text-ink-9 hover:text-ink-12" : "text-ink-5 hover:text-ink-0",
        danger && !light && "hover:text-[color:var(--signal-danger)]",
        danger && light && "hover:text-red-300",
      )}
    >
      <Icon className="h-2.5 w-2.5" strokeWidth={2} />
    </button>
  );
}
