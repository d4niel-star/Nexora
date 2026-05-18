"use client";

// ─── Visual Editor Pro — Main Shell ──────────────────────────────────────────
//
// Professional 3-panel editor: Structure | Canvas | Inspector
// with toolbar, status bar, undo/redo, draft/publish, keyboard shortcuts.
// Replaces ThemeEditorShell as the primary editing surface.

import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Layers,
  Monitor,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Redo2,
  Save,
  Smartphone,
  Tablet,
  Trash2,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { saveHomeBlocks, publishStoreAction, saveDraftAction } from "@/lib/store-engine/actions";
import type { AdminStoreInitialData, BlockType } from "@/types/store-engine";

import { editorReducer, INITIAL_EDITOR_STATE } from "./engine/reducer";
import { EditorHistory } from "./engine/history";
import type { DeviceMode, EditorSnapshot, EditorSelection, InspectorTab, SectionBlock } from "./engine/types";
import { SECTION_LIBRARY, findSectionDef } from "./engine/section-library";
import { canAddSection, MAX_SECTIONS } from "./engine/guardrails";
import { StructurePanel } from "./panels/StructurePanel";
import { InspectorPanel } from "./panels/InspectorPanel";

// ─── Block labels ────────────────────────────────────────────────────────────

const BLOCK_LABELS: Record<string, string> = {
  hero: "Hero",
  featured_products: "Productos destacados",
  featured_categories: "Categorías",
  benefits: "Beneficios",
  testimonials: "Testimonios",
  faq: "FAQ",
  newsletter: "Newsletter",
};

// ─── Serialize blocks for server save ────────────────────────────────────────

function serializeBlocks(blocks: SectionBlock[]) {
  return blocks.map((b) => ({
    blockType: b.blockType as BlockType,
    sortOrder: b.sortOrder,
    isVisible: b.isVisible,
    settingsJson: JSON.stringify(b.settings),
    source: b.source,
    state: "published",
  }));
}

// ─── Main component ──────────────────────────────────────────────────────────

export function VisualEditorPro({
  initialData,
}: {
  initialData: AdminStoreInitialData | null;
}) {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const historyRef = useRef(new EditorHistory());
  const [isPending, startTransition] = useTransition();
  const [previewKey, setPreviewKey] = useState(0);
  const [origin, setOrigin] = useState("");
  const [showAddSection, setShowAddSection] = useState(false);
  const [saveIndicator, setSaveIndicator] = useState<"idle" | "saving" | "saved">("idle");

  // Initialize state from server data
  const initialBlocks: SectionBlock[] = useMemo(
    () =>
      initialData?.homeBlocks.map((b) => ({
        id: b.id,
        blockType: b.blockType,
        sortOrder: b.sortOrder,
        isVisible: b.isVisible,
        settings: b.settings,
        source: b.source,
        state: b.state,
      })) ?? [],
    [initialData],
  );

  const initialNav = useMemo(
    () =>
      initialData?.navigation.map((n) => ({
        id: n.id,
        group: n.group,
        label: n.label,
        href: n.href,
        sortOrder: n.sortOrder,
        isVisible: n.isVisible,
      })) ?? [],
    [initialData],
  );

  const [state, dispatch] = useReducer(editorReducer, {
    ...INITIAL_EDITOR_STATE,
    blocks: initialBlocks,
    navigation: initialNav,
  });

  useEffect(() => { setOrigin(window.location.origin); }, []);

  // Sync initial data changes
  useEffect(() => {
    dispatch({ type: "SET_BLOCKS", blocks: initialBlocks });
  }, [initialBlocks]);

  const storeSlug = initialData?.store.slug;
  const publicPath = storeSlug ? `/store/${storeSlug}` : "";

  // ─── Snapshot for undo/redo ────────────────────────────────────────────

  const currentSnapshot = useCallback(
    (): EditorSnapshot => ({ blocks: state.blocks, navigation: state.navigation }),
    [state.blocks, state.navigation],
  );

  const pushHistory = useCallback(() => {
    historyRef.current.push(currentSnapshot());
  }, [currentSnapshot]);

  // ─── Actions ───────────────────────────────────────────────────────────

  const refreshPreview = useCallback(() => {
    setPreviewKey((k) => k + 1);
    router.refresh();
  }, [router]);

  const saveDraft = useCallback(() => {
    setSaveIndicator("saving");
    startTransition(async () => {
      await saveHomeBlocks(serializeBlocks(state.blocks));
      await saveDraftAction();
      dispatch({ type: "SET_PUBLISH_STATUS", status: "draft" });
      setSaveIndicator("saved");
      refreshPreview();
      setTimeout(() => setSaveIndicator("idle"), 2000);
    });
  }, [state.blocks, refreshPreview]);

  const publish = useCallback(() => {
    setSaveIndicator("saving");
    startTransition(async () => {
      await saveHomeBlocks(serializeBlocks(state.blocks));
      await publishStoreAction();
      dispatch({ type: "MARK_CLEAN" });
      setSaveIndicator("saved");
      refreshPreview();
      setTimeout(() => setSaveIndicator("idle"), 2000);
    });
  }, [state.blocks, refreshPreview]);

  const undo = useCallback(() => {
    const snapshot = historyRef.current.undo(currentSnapshot());
    if (snapshot) dispatch({ type: "RESTORE_SNAPSHOT", snapshot });
  }, [currentSnapshot]);

  const redo = useCallback(() => {
    const snapshot = historyRef.current.redo(currentSnapshot());
    if (snapshot) dispatch({ type: "RESTORE_SNAPSHOT", snapshot });
  }, [currentSnapshot]);

  // Push history before mutations
  const dispatchWithHistory = useCallback(
    (action: Parameters<typeof dispatch>[0]) => {
      const mutating = [
        "UPDATE_BLOCK_SETTINGS", "TOGGLE_BLOCK_VISIBILITY", "MOVE_BLOCK",
        "DUPLICATE_BLOCK", "REMOVE_BLOCK", "ADD_BLOCK", "SET_NAVIGATION",
      ];
      if (mutating.includes(action.type)) pushHistory();
      dispatch(action);
    },
    [pushHistory],
  );

  // ─── Keyboard shortcuts ────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isCmd = e.metaKey || e.ctrlKey;
      if (isCmd && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if (isCmd && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
      if (isCmd && e.key === "s") { e.preventDefault(); saveDraft(); }
      if (isCmd && e.shiftKey && e.key === "P") { e.preventDefault(); publish(); }
      if (e.key === "Escape") dispatch({ type: "SELECT_SECTION", selection: { sectionId: null, sectionType: null } });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, saveDraft, publish]);

  // ─── Unsaved changes warning ───────────────────────────────────────────

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (state.isDirty) { e.preventDefault(); }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [state.isDirty]);

  // ─── iframe message listener for section selection ─────────────────────

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "nexora-edit-section") {
        const { sectionType, sectionId } = event.data;
        dispatchWithHistory({
          type: "SELECT_SECTION",
          selection: { sectionId, sectionType },
        });
      }
      if (event.data?.type === "nexora-inline-edit") {
        const { sectionId, field, value } = event.data;
        const block = state.blocks.find((b) => b.id === sectionId);
        if (block && field && typeof value === "string") {
          dispatchWithHistory({
            type: "UPDATE_BLOCK_SETTINGS",
            blockId: sectionId,
            settings: { ...block.settings, [field]: value },
          });
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [dispatchWithHistory, state.blocks]);

  // ─── Scroll to section in iframe when selected ─────────────────────

  useEffect(() => {
    const sectionId = state.selectedSection.sectionId;
    if (!sectionId || !iframeRef.current?.contentDocument) return;
    const el = iframeRef.current.contentDocument.querySelector(
      `[data-section-id="${sectionId}"]`,
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Highlight
      const doc = iframeRef.current.contentDocument;
      doc.querySelectorAll(".nexora-selected").forEach((s) => s.classList.remove("nexora-selected"));
      el.classList.add("nexora-selected");
    }
  }, [state.selectedSection.sectionId]);

  // ─── iframe overlay injection ──────────────────────────────────────────

  const handleIframeLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return;
    const doc = iframe.contentDocument;

    const style = doc.createElement("style");
    style.textContent = `
      [data-section-type]{position:relative;cursor:pointer;transition:outline 120ms,box-shadow 120ms}
      [data-section-type]:hover{outline:2px solid rgba(59,130,246,0.35);outline-offset:-2px}
      [data-section-type].nexora-selected{outline:2px solid rgba(59,130,246,0.8);outline-offset:-2px;box-shadow:inset 0 0 0 1px rgba(59,130,246,0.15)}
      .nexora-hover-label{position:absolute;top:6px;right:6px;z-index:9999;display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:4px;background:rgba(15,23,42,0.88);color:#fff;font-family:ui-sans-serif,system-ui,sans-serif;font-size:10px;font-weight:600;letter-spacing:0.03em;white-space:nowrap;backdrop-filter:blur(6px);pointer-events:none;opacity:0;transition:opacity 100ms}
      [data-section-type]:hover .nexora-hover-label{opacity:1}
      [data-section-type].nexora-selected .nexora-hover-label{opacity:1;background:rgba(59,130,246,0.9)}
      [data-nexora-editable]{cursor:text;outline:1px dashed transparent;outline-offset:2px;border-radius:2px;transition:outline 120ms}
      [data-nexora-editable]:hover{outline-color:rgba(59,130,246,0.3)}
      [data-nexora-editable]:focus{outline-color:rgba(59,130,246,0.6);background:rgba(59,130,246,0.04)}
    `;
    doc.head.appendChild(style);

    const sections = doc.querySelectorAll("[data-section-type]");
    sections.forEach((section) => {
      const el = section as HTMLElement;
      const sectionType = el.getAttribute("data-section-type") ?? "";
      const sectionId = el.getAttribute("data-section-id") ?? "";

      // Hover label
      const label = doc.createElement("span");
      label.className = "nexora-hover-label";
      label.textContent = BLOCK_LABELS[sectionType] ?? sectionType;
      el.appendChild(label);

      // Click to select
      el.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        // If clicking an editable element, don't select section
        if (target.hasAttribute("data-nexora-editable") || target.isContentEditable) return;
        e.preventDefault();
        e.stopPropagation();
        doc.querySelectorAll(".nexora-selected").forEach((s) => s.classList.remove("nexora-selected"));
        el.classList.add("nexora-selected");
        iframe.contentWindow?.parent.postMessage(
          { type: "nexora-edit-section", sectionType, sectionId },
          "*",
        );
      });

      // ── Inline editing: make text elements editable ──────────────────
      const editableSelectors = "h1,h2,h3,h4,p.hero-subheadline,[data-editable-field]";
      el.querySelectorAll(editableSelectors).forEach((textEl) => {
        const htmlEl = textEl as HTMLElement;
        htmlEl.setAttribute("data-nexora-editable", "true");
        htmlEl.contentEditable = "true";
        htmlEl.spellcheck = false;
        htmlEl.addEventListener("focus", () => {
          // Select the parent section when editing text
          doc.querySelectorAll(".nexora-selected").forEach((s) => s.classList.remove("nexora-selected"));
          el.classList.add("nexora-selected");
          iframe.contentWindow?.parent.postMessage(
            { type: "nexora-edit-section", sectionType, sectionId },
            "*",
          );
        });
        htmlEl.addEventListener("blur", () => {
          const field = htmlEl.getAttribute("data-editable-field") ??
            (htmlEl.tagName === "H1" || htmlEl.tagName === "H2" ? "headline" : "subheadline");
          const text = htmlEl.textContent?.trim() ?? "";
          iframe.contentWindow?.parent.postMessage(
            { type: "nexora-inline-edit", sectionId, field, value: text },
            "*",
          );
        });
        // Sanitize: prevent paste of rich HTML
        htmlEl.addEventListener("paste", (e) => {
          e.preventDefault();
          const text = (e as ClipboardEvent).clipboardData?.getData("text/plain") ?? "";
          doc.execCommand("insertText", false, text);
        });
        // Prevent Enter from creating new lines
        htmlEl.addEventListener("keydown", (e) => {
          if (e.key === "Enter") { e.preventDefault(); htmlEl.blur(); }
          if (e.key === "Escape") { htmlEl.blur(); }
        });
      });
    });
  }, []);

  // ─── Preview URL ───────────────────────────────────────────────────────

  const previewSrc = origin && publicPath ? `${origin}${publicPath}?_t=${previewKey}` : "";

  // ─── Device sizing ─────────────────────────────────────────────────────

  const deviceClass = {
    desktop: "h-full w-full",
    tablet: "h-[768px] w-[1024px] max-h-full max-w-full",
    mobile: "h-[720px] w-[390px] max-h-full",
  }[state.deviceMode];

  const deviceLabel = { desktop: "1440px", tablet: "1024×768", mobile: "390×844" }[state.deviceMode];

  // ─── Selected block ────────────────────────────────────────────────────

  const selectedBlock = state.blocks.find((b) => b.id === state.selectedSection.sectionId) ?? null;

  if (!initialData) {
    return (
      <div className="flex h-[calc(100vh-56px)] items-center justify-center bg-[var(--admin-canvas)]">
        <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6 text-center">
          <p className="text-[13px] font-medium text-ink-0">No hay tienda para editar.</p>
          <p className="mt-1 text-[12px] text-ink-5">Crea una tienda antes de abrir el editor.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col overflow-hidden bg-[var(--admin-canvas)]">
      {/* ═══ TOOLBAR ═══════════════════════════════════════════════════════ */}
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-[color:var(--hairline)] bg-[var(--surface-0)] px-3">
        {/* Left: back + title */}
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/admin/store-ai"
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink-5 transition-colors hover:bg-[var(--surface-1)] hover:text-ink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
          </Link>
          <div className="h-4 w-px bg-[var(--hairline)]" />
          <p className="truncate text-[12px] font-semibold text-ink-0">{initialData.store.name}</p>
          <StatusBadge status={state.publishStatus} isDirty={state.isDirty} />
        </div>

        {/* Center: save + publish + undo/redo */}
        <div className="flex items-center gap-1">
          <ToolbarButton
            icon={Undo2}
            label="Deshacer (Ctrl+Z)"
            onClick={undo}
            disabled={!historyRef.current.canUndo}
          />
          <ToolbarButton
            icon={Redo2}
            label="Rehacer (Ctrl+Y)"
            onClick={redo}
            disabled={!historyRef.current.canRedo}
          />
          <div className="mx-1 h-4 w-px bg-[var(--hairline)]" />
          <button
            type="button"
            onClick={saveDraft}
            disabled={isPending || !state.isDirty}
            className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[color:var(--hairline)] bg-[var(--surface-1)] px-3 text-[11px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)] disabled:opacity-40"
          >
            <Save className="h-3 w-3" strokeWidth={1.75} />
            {saveIndicator === "saving" ? "Guardando..." : saveIndicator === "saved" ? "Guardado" : "Guardar borrador"}
          </button>
          <button
            type="button"
            onClick={publish}
            disabled={isPending}
            className="inline-flex h-7 items-center gap-1.5 rounded-full bg-ink-0 px-3.5 text-[11px] font-semibold text-ink-12 transition-colors hover:bg-ink-2 disabled:opacity-50"
          >
            <Upload className="h-3 w-3" strokeWidth={1.75} />
            Publicar
          </button>
        </div>

        {/* Right: device + panels + view */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center rounded-full border border-[color:var(--hairline)] bg-[var(--surface-1)] p-0.5">
            {(["desktop", "tablet", "mobile"] as DeviceMode[]).map((d) => {
              const Icon = d === "desktop" ? Monitor : d === "tablet" ? Tablet : Smartphone;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => dispatch({ type: "SET_DEVICE", device: d })}
                  className={cn(
                    "rounded-full p-1 transition-colors",
                    state.deviceMode === d
                      ? "bg-[var(--surface-0)] text-ink-0 shadow-[var(--shadow-soft)]"
                      : "text-ink-5 hover:text-ink-0",
                  )}
                  aria-label={d}
                >
                  <Icon className="h-3 w-3" strokeWidth={1.75} />
                </button>
              );
            })}
          </div>
          <div className="mx-0.5 h-4 w-px bg-[var(--hairline)]" />
          <ToolbarButton
            icon={state.structurePanelOpen ? PanelLeftClose : PanelLeftOpen}
            label="Panel estructura"
            onClick={() => dispatch({ type: "TOGGLE_STRUCTURE_PANEL" })}
            active={state.structurePanelOpen}
          />
          <ToolbarButton
            icon={state.inspectorPanelOpen ? PanelRightClose : PanelRightOpen}
            label="Panel inspector"
            onClick={() => dispatch({ type: "TOGGLE_INSPECTOR_PANEL" })}
            active={state.inspectorPanelOpen}
          />
          <div className="mx-0.5 h-4 w-px bg-[var(--hairline)]" />
          <Link
            href={publicPath}
            target="_blank"
            className="inline-flex h-7 items-center gap-1 rounded-full border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2.5 text-[10px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)]"
          >
            <Eye className="h-3 w-3" strokeWidth={1.75} />
            Ver
          </Link>
        </div>
      </header>

      {/* ═══ MAIN AREA ═════════════════════════════════════════════════════ */}
      <div className="flex flex-1 overflow-hidden">
        {/* ─── Structure Panel ─────────────────────────────────────────── */}
        {state.structurePanelOpen && (
          <StructurePanel
            blocks={state.blocks}
            selectedSection={state.selectedSection}
            activePage={state.activePage}
            onSelectSection={(sel) => dispatchWithHistory({ type: "SELECT_SECTION", selection: sel })}
            onToggleVisibility={(id) => dispatchWithHistory({ type: "TOGGLE_BLOCK_VISIBILITY", blockId: id })}
            onMoveBlock={(id, dir) => dispatchWithHistory({ type: "MOVE_BLOCK", blockId: id, direction: dir })}
            onDuplicate={(id) => dispatchWithHistory({ type: "DUPLICATE_BLOCK", blockId: id })}
            onRemove={(id) => dispatchWithHistory({ type: "REMOVE_BLOCK", blockId: id })}
            onAddSection={() => setShowAddSection(true)}
            onPageChange={(page) => dispatch({ type: "SET_PAGE", page })}
          />
        )}

        {/* ─── Canvas ──────────────────────────────────────────────────── */}
        <main className="relative flex flex-1 flex-col overflow-hidden">
          {/* Canvas header */}
          <div className="flex h-8 shrink-0 items-center justify-between border-b border-[color:var(--hairline)] bg-[var(--surface-0)] px-3">
            <span className="text-[10px] font-medium text-ink-5">
              {deviceLabel}
            </span>
            <span className="text-[10px] font-mono text-ink-6">
              {publicPath}
            </span>
          </div>

          {/* Canvas viewport */}
          <div className={cn(
            "flex flex-1 overflow-hidden",
            state.deviceMode === "desktop" ? "p-0" : "items-center justify-center p-4 bg-[var(--admin-canvas)]",
          )}>
            <div className={cn(
              "relative overflow-hidden bg-white transition-all duration-300",
              state.deviceMode === "desktop"
                ? "h-full w-full"
                : "rounded-[var(--r-lg)] border border-[color:var(--hairline)] shadow-[var(--shadow-overlay)]",
              deviceClass,
            )}>
              {previewSrc ? (
                <iframe
                  key={`preview-${previewKey}`}
                  ref={iframeRef}
                  src={previewSrc}
                  onLoad={handleIframeLoad}
                  className="h-full w-full border-0"
                  title="Storefront preview"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-[12px] text-ink-5">Preparando preview...</p>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* ─── Inspector Panel ──────────────────────────────────────────── */}
        {state.inspectorPanelOpen && (
          <InspectorPanel
            block={selectedBlock}
            allBlocks={state.blocks}
            activeTab={state.inspectorTab}
            onTabChange={(tab) => dispatch({ type: "SET_INSPECTOR_TAB", tab })}
            onUpdateSettings={(blockId, settings) =>
              dispatchWithHistory({ type: "UPDATE_BLOCK_SETTINGS", blockId, settings })
            }
            onSave={() => {
              startTransition(async () => {
                setSaveIndicator("saving");
                await saveHomeBlocks(serializeBlocks(state.blocks));
                setSaveIndicator("saved");
                refreshPreview();
                setTimeout(() => setSaveIndicator("idle"), 2000);
              });
            }}
            isPending={isPending}
          />
        )}
      </div>

      {/* ═══ STATUS BAR ════════════════════════════════════════════════════ */}
      <footer className="flex h-7 shrink-0 items-center justify-between border-t border-[color:var(--hairline)] bg-[var(--surface-0)] px-3">
        <div className="flex items-center gap-3 text-[10px] text-ink-5">
          <span>{state.blocks.length} secciones</span>
          <span>{state.blocks.filter((b) => b.isVisible).length} visibles</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-ink-5">
          <span>Ctrl+Z deshacer</span>
          <span>Ctrl+S guardar</span>
          {state.isDirty && <span className="font-medium text-[color:var(--signal-warning)]">Sin guardar</span>}
        </div>
      </footer>

      {/* ═══ ADD SECTION MODAL ═════════════════════════════════════════════ */}
      {showAddSection && (
        canAddSection(state.blocks.length) ? (
          <AddSectionModal
            onAdd={(blockType, settings) => {
              dispatchWithHistory({ type: "ADD_BLOCK", blockType, settings });
              setShowAddSection(false);
            }}
            onClose={() => setShowAddSection(false)}
          />
        ) : (
          <LimitReachedModal onClose={() => setShowAddSection(false)} />
        )
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════════

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  active,
}: {
  icon: typeof Undo2;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-full transition-colors disabled:opacity-30",
        active
          ? "bg-[var(--surface-1)] text-ink-0"
          : "text-ink-5 hover:bg-[var(--surface-1)] hover:text-ink-0",
      )}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
    </button>
  );
}

function StatusBadge({ status, isDirty }: { status: string; isDirty: boolean }) {
  if (isDirty) {
    return (
      <span className="inline-flex items-center rounded-full bg-[color:var(--signal-warning)]/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[color:var(--signal-warning)]">
        Sin guardar
      </span>
    );
  }
  const map: Record<string, { label: string; cls: string }> = {
    published: { label: "Publicado", cls: "bg-[color:var(--signal-success)]/10 text-[color:var(--signal-success)]" },
    draft: { label: "Borrador", cls: "bg-[var(--surface-2)] text-ink-5" },
    modified: { label: "Modificado", cls: "bg-[color:var(--signal-warning)]/10 text-[color:var(--signal-warning)]" },
  };
  const info = map[status] ?? map.draft;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em]", info.cls)}>
      {info.label}
    </span>
  );
}

function AddSectionModal({
  onAdd,
  onClose,
}: {
  onAdd: (blockType: string, settings: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-50 bg-ink-0/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div className="fixed left-1/2 top-1/2 z-50 w-[520px] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-overlay)]">
        <div className="flex items-center justify-between border-b border-[color:var(--hairline)] px-5 py-3.5">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Librería de secciones</p>
            <h2 className="mt-0.5 text-[15px] font-semibold text-ink-0">Agregar sección</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-ink-5 hover:text-ink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-3">
          <div className="grid grid-cols-2 gap-2">
            {SECTION_LIBRARY.map((sec) => {
              const Icon = sec.icon;
              return (
                <button
                  key={sec.blockType}
                  type="button"
                  onClick={() => onAdd(sec.blockType, { ...sec.defaultSettings })}
                  className="flex items-start gap-3 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-3.5 text-left transition-colors hover:bg-[var(--surface-2)] hover:border-[color:var(--hairline-strong)]"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] text-ink-5">
                    <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-ink-0">{sec.label}</p>
                    <p className="mt-0.5 text-[10px] leading-[1.4] text-ink-5">{sec.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

function LimitReachedModal({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-50 bg-ink-0/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div className="fixed left-1/2 top-1/2 z-50 w-[400px] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6 shadow-[var(--shadow-overlay)] text-center">
        <p className="text-[14px] font-semibold text-ink-0">Límite alcanzado</p>
        <p className="mt-2 text-[12px] text-ink-5">
          Máximo {MAX_SECTIONS} secciones por página. Eliminá o combiná secciones para agregar nuevas.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 inline-flex h-8 items-center rounded-full bg-ink-0 px-4 text-[11px] font-semibold text-ink-12 hover:bg-ink-2"
        >
          Entendido
        </button>
      </div>
    </>
  );
}
