"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { ComponentType, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Eye,
  EyeOff,
  Home,
  Image as ImageIcon,
  Menu,
  Monitor,
  Paintbrush,
  PanelBottom,
  PanelTop,
  Pencil,
  Save,
  Smartphone,
  Store,
  Type,
  X,
} from "lucide-react";

import { SectionEditorDrawer } from "@/components/admin/store/SectionEditorDrawer";
import type { SectionBlock } from "@/components/admin/store/SectionEditorDrawer";
import { NexoraEditorChat } from "@/components/admin/store-ai/NexoraEditorChat";
import { cn } from "@/lib/utils";
import {
  saveHomeBlocks,
  saveStoreBranding,
  saveStoreNavigation,
  saveStoreProfileAction,
} from "@/lib/store-engine/actions";
import {
  STORE_BUTTON_STYLES,
  STORE_FONT_OPTIONS,
  STORE_TONES,
  resolveStoreFontOption,
} from "@/lib/store-engine/theme-tokens";
import type { AdminStoreInitialData, BlockType } from "@/types/store-engine";

type EditorPanel = "colors" | "typography" | "buttons" | "identity" | "media" | "header" | "home" | "footer";
type PreviewSurface = "home" | "listing" | "product" | "cart";

type NavigationDraft = {
  id: string;
  group: string;
  label: string;
  href: string;
  sortOrder: number;
  isVisible: boolean;
};

const BLOCK_LABELS: Record<string, string> = {
  hero: "Hero principal",
  featured_products: "Productos destacados",
  featured_categories: "Categorias",
  benefits: "Beneficios",
  testimonials: "Testimonios",
  faq: "Preguntas frecuentes",
  newsletter: "Newsletter",
};

const PANEL_DEFS: Array<{
  id: EditorPanel;
  label: string;
  caption: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
}> = [
  { id: "colors", label: "Colores", caption: "Paleta real", icon: Paintbrush },
  { id: "typography", label: "Tipografia", caption: "Fuente aplicada", icon: Type },
  { id: "buttons", label: "Botones", caption: "CTAs reales", icon: Pencil },
  { id: "identity", label: "Identidad", caption: "Marca, slug y tono", icon: Store },
  { id: "media", label: "Media", caption: "Logo visible", icon: ImageIcon },
  { id: "header", label: "Encabezado", caption: "Menu principal", icon: PanelTop },
  { id: "home", label: "Inicio", caption: "Bloques del home", icon: Home },
  { id: "footer", label: "Pie de pagina", caption: "Grupos y links", icon: PanelBottom },
];

const PANEL_META: Record<EditorPanel, { scope: string; model: string; preview: PreviewSurface }> = {
  colors: { scope: "Global", model: "StoreBranding", preview: "home" },
  typography: { scope: "Global", model: "StoreBranding", preview: "home" },
  buttons: { scope: "Global", model: "StoreBranding", preview: "cart" },
  identity: { scope: "Tienda", model: "Store + StoreBranding", preview: "home" },
  media: { scope: "Tienda", model: "StoreBranding.logoUrl", preview: "home" },
  header: { scope: "Navegacion", model: "StoreNavigation.header", preview: "home" },
  home: { scope: "Pagina", model: "StoreBlock.home", preview: "home" },
  footer: { scope: "Navegacion", model: "StoreNavigation.footer_*", preview: "home" },
};

const inputCls =
  "w-full h-10 px-3 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] text-[12px] font-medium text-ink-0 outline-none transition-[box-shadow,border-color] focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)] placeholder:text-ink-6";
const textareaCls = cn(inputCls, "h-auto min-h-20 py-2.5 leading-[1.45]");
const sectionTitle = "text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5";

function toSectionBlocks(initialData: AdminStoreInitialData | null): SectionBlock[] {
  return initialData
    ? initialData.homeBlocks.map((block) => ({
        id: block.id,
        blockType: block.blockType,
        sortOrder: block.sortOrder,
        isVisible: block.isVisible,
        settings: block.settings,
        source: block.source,
        state: block.state,
      }))
    : [];
}

function toNavigationDrafts(initialData: AdminStoreInitialData | null): NavigationDraft[] {
  return initialData
    ? initialData.navigation.map((item) => ({
        id: item.id,
        group: item.group,
        label: item.label,
        href: item.href,
        sortOrder: item.sortOrder,
        isVisible: item.isVisible,
      }))
    : [];
}

function serializeBlocks(blocks: SectionBlock[]) {
  return blocks.map((block) => ({
    blockType: block.blockType as BlockType,
    sortOrder: block.sortOrder,
    isVisible: block.isVisible,
    settingsJson: JSON.stringify(block.settings),
    source: block.source,
    state: "published",
  }));
}

function normalizeNavigationForSave(items: NavigationDraft[]) {
  const counters: Record<string, number> = {};

  return items
    .filter((item) => item.label.trim() && item.href.trim())
    .map((item) => {
      const order = counters[item.group] ?? 0;
      counters[item.group] = order + 1;
      return {
        group: item.group,
        label: item.label.trim(),
        href: item.href.trim(),
        sortOrder: order,
        isVisible: item.isVisible,
      };
    });
}

function createDraftId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ThemeEditorShell({
  initialData,
}: {
  initialData: AdminStoreInitialData | null;
}) {
  const router = useRouter();
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [activePanel, setActivePanel] = useState<EditorPanel>("colors");
  const [previewSurface, setPreviewSurface] = useState<PreviewSurface>("home");
  const [previewKey, setPreviewKey] = useState(0);
  const [origin, setOrigin] = useState("");
  const [sectionEditorBlock, setSectionEditorBlock] = useState<SectionBlock | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const initialBlocks = useMemo(() => toSectionBlocks(initialData), [initialData]);
  const initialNavigation = useMemo(() => toNavigationDrafts(initialData), [initialData]);
  const [homeBlocks, setHomeBlocks] = useState<SectionBlock[]>(initialBlocks);
  const [navigation, setNavigation] = useState<NavigationDraft[]>(initialNavigation);

  // Sync props → local state when parent re-renders with new data (e.g. after server action)
  useEffect(() => { setHomeBlocks(initialBlocks); }, [initialBlocks]); // eslint-disable-line react-hooks/set-state-in-effect
  useEffect(() => { setNavigation(initialNavigation); }, [initialNavigation]); // eslint-disable-line react-hooks/set-state-in-effect
  useEffect(() => { setOrigin(window.location.origin); }, []); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps

  const storeSlug = initialData?.store.slug;
  const publicPath = storeSlug ? `/store/${storeSlug}` : "";

  const previewSurfaces = useMemo(
    () => [
      { id: "home" as const, label: "Home", path: publicPath, enabled: !!publicPath },
      { id: "listing" as const, label: "Listado", path: `${publicPath}/products`, enabled: !!publicPath },
      {
        id: "product" as const,
        label: "Producto",
        path: initialData?.preview.product
          ? `${publicPath}/products/${initialData.preview.product.handle}`
          : `${publicPath}/products`,
        enabled: !!publicPath && !!initialData?.preview.product,
      },
      { id: "cart" as const, label: "Carrito", path: `${publicPath}/cart`, enabled: !!publicPath },
    ],
    [initialData?.preview.product, publicPath],
  );

  const currentSurface = previewSurfaces.find((surface) => surface.id === previewSurface && surface.enabled) ?? previewSurfaces[0];
  const previewSrc =
    origin && currentSurface?.enabled
      ? `${origin}${currentSurface.path}?_t=${previewKey}`
      : "";

  const refreshPreview = useCallback(() => {
    setPreviewKey((key) => key + 1);
    router.refresh();
  }, [router]);

  const changePanel = (panel: EditorPanel) => {
    setActivePanel(panel);
    setPreviewSurface(PANEL_META[panel].preview);
  };

  // ─── Inline edit overlay: inject script into iframe + listen for messages ───
  const SECTION_LABEL_MAP: Record<string, string> = {
    hero: "Hero",
    benefits: "Beneficios",
    featured_products: "Productos destacados",
    featured_categories: "Categorías",
    testimonials: "Testimonios",
    faq: "Preguntas frecuentes",
    newsletter: "Newsletter",
  };

  const handleIframeLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument) return;

    const doc = iframe.contentDocument;

    // Inject overlay styles
    const style = doc.createElement("style");
    style.textContent = `
      [data-section-type] { position: relative; }
      .nexora-edit-overlay {
        position: absolute;
        inset: 0;
        border: 2px solid rgba(59, 130, 246, 0.5);
        background: rgba(59, 130, 246, 0.04);
        z-index: 9999;
        pointer-events: none;
        transition: opacity 120ms ease;
        display: flex;
        align-items: flex-start;
        justify-content: flex-end;
        padding: 8px;
      }
      .nexora-edit-label {
        pointer-events: auto;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 3px 8px;
        border-radius: 4px;
        background: rgba(15, 23, 42, 0.85);
        color: #fff;
        font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.02em;
        line-height: 1;
        white-space: nowrap;
        backdrop-filter: blur(4px);
      }
      .nexora-edit-label svg {
        width: 12px;
        height: 12px;
        stroke: currentColor;
        fill: none;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
    `;
    doc.head.appendChild(style);

    const sections = doc.querySelectorAll("[data-section-type]");
    sections.forEach((section) => {
      const el = section as HTMLElement;
      const sectionType = el.getAttribute("data-section-type") ?? "";
      const sectionId = el.getAttribute("data-section-id") ?? "";

      const overlay = doc.createElement("div");
      overlay.className = "nexora-edit-overlay";
      overlay.style.opacity = "0";

      const label = doc.createElement("button");
      label.className = "nexora-edit-label";
      label.innerHTML = `<svg viewBox="0 0 24 24"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>${SECTION_LABEL_MAP[sectionType] ?? sectionType}`;

      label.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        iframe.contentWindow?.parent.postMessage(
          { type: "nexora-edit-section", sectionType, sectionId },
          "*"
        );
      });

      overlay.appendChild(label);
      el.style.position = "relative";
      el.appendChild(overlay);

      el.addEventListener("mouseenter", () => {
        overlay.style.opacity = "1";
      });
      el.addEventListener("mouseleave", () => {
        overlay.style.opacity = "0";
      });
    });
  }, [SECTION_LABEL_MAP]);

  // Listen for edit-section messages from iframe
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type !== "nexora-edit-section") return;
      const { sectionType, sectionId } = event.data as { sectionType: string; sectionId: string };

      // Map section type to the correct editor panel
      const panelMap: Record<string, EditorPanel> = {
        hero: "home",
        benefits: "home",
        featured_products: "home",
        featured_categories: "home",
        testimonials: "home",
        faq: "home",
        newsletter: "home",
      };
      const targetPanel = panelMap[sectionType];
      if (targetPanel) {
        setActivePanel(targetPanel);
        setPreviewSurface("home");

        // Find the matching block and open its section editor
        const block = homeBlocks.find((b) => b.id === sectionId);
        if (block) {
          setSectionEditorBlock(block);
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [homeBlocks]);

  if (!initialData) {
    return (
      <div className="flex h-[calc(100vh-56px)] items-center justify-center bg-[var(--surface-1)]">
        <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6 text-center">
          <p className="text-[13px] font-medium text-ink-0">Todavia no hay tienda para editar.</p>
          <p className="mt-1 text-[12px] text-ink-5">Crea una tienda antes de abrir el editor.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col overflow-hidden bg-[var(--surface-1)]">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[color:var(--hairline)] bg-[var(--surface-0)] px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/admin/store-ai" className="flex h-8 w-8 items-center justify-center rounded-[var(--r-sm)] text-ink-5 transition-colors hover:bg-[var(--surface-1)] hover:text-ink-0 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          </Link>
          <div className="h-4 w-px bg-[var(--hairline)]" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold tracking-[-0.01em] text-ink-0">Editor de tienda</p>
            <p className="truncate text-[10px] font-medium text-ink-5">
              {initialData.store.name} / {PANEL_DEFS.find((panel) => panel.id === activePanel)?.label}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-0.5 lg:flex">
            {previewSurfaces.map((surface) => (
              <button
                key={surface.id}
                type="button"
                disabled={!surface.enabled}
                onClick={() => setPreviewSurface(surface.id)}
                className={cn(
                  "h-7 rounded-[var(--r-xs)] px-2.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
                  previewSurface === surface.id ? "bg-[var(--surface-0)] text-ink-0 shadow-sm" : "text-ink-5 hover:text-ink-0",
                  !surface.enabled && "cursor-not-allowed opacity-40",
                )}
              >
                {surface.label}
              </button>
            ))}
          </div>

          <div className="flex rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-0.5">
            <button type="button" onClick={() => setDevice("desktop")} className={cn("rounded-[var(--r-xs)] px-2.5 py-1 transition-colors focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]", device === "desktop" ? "bg-[var(--surface-0)] text-ink-0 shadow-sm" : "text-ink-5 hover:text-ink-0")} aria-label="Preview desktop">
              <Monitor className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
            <button type="button" onClick={() => setDevice("mobile")} className={cn("rounded-[var(--r-xs)] px-2.5 py-1 transition-colors focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]", device === "mobile" ? "bg-[var(--surface-0)] text-ink-0 shadow-sm" : "text-ink-5 hover:text-ink-0")} aria-label="Preview mobile">
              <Smartphone className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </div>

          <Link href={currentSurface?.path ?? publicPath} target="_blank" className="inline-flex h-8 items-center gap-1.5 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-3 text-[11px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-1)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]">
            <Eye className="h-3 w-3" strokeWidth={1.75} />
            Ver tienda
          </Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-[380px] shrink-0 flex-col border-r border-[color:var(--hairline)] bg-[var(--surface-0)]">
          <nav className="space-y-1 overflow-y-auto border-b border-[color:var(--hairline)] p-2" aria-label="Categorias del editor">
            {PANEL_DEFS.map((panel) => {
              const Icon = panel.icon;
              const active = activePanel === panel.id;
              return (
                <button key={panel.id} type="button" onClick={() => changePanel(panel.id)} className={cn("flex w-full items-center gap-3 rounded-[var(--r-sm)] px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]", active ? "bg-ink-0 text-ink-12" : "text-ink-0 hover:bg-[var(--surface-1)]")}>
                  <Icon className={cn("h-4 w-4 shrink-0", active ? "text-ink-12" : "text-ink-5")} strokeWidth={1.75} />
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-semibold">{panel.label}</span>
                    <span className={cn("block truncate text-[10px]", active ? "text-ink-9" : "text-ink-5")}>{panel.caption}</span>
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="flex-1 overflow-y-auto">
            <div className="flex min-h-full flex-col gap-4 p-4">
              {activePanel === "colors" && <ColorsPanel initialData={initialData} onSaved={refreshPreview} />}
              {activePanel === "typography" && <TypographyPanel initialData={initialData} onSaved={refreshPreview} />}
              {activePanel === "buttons" && <ButtonsPanel initialData={initialData} onSaved={refreshPreview} />}
              {activePanel === "identity" && <IdentityPanel initialData={initialData} onSaved={refreshPreview} />}
              {activePanel === "media" && <MediaPanel initialData={initialData} onSaved={refreshPreview} />}
              {activePanel === "header" && <NavigationPanel mode="header" navigation={navigation} onNavigationChange={setNavigation} onSaved={refreshPreview} />}
              {activePanel === "home" && <HomePanel blocks={homeBlocks} onBlocksChange={setHomeBlocks} onEditBlock={setSectionEditorBlock} onSaved={refreshPreview} />}
              {activePanel === "footer" && <NavigationPanel mode="footer" navigation={navigation} onNavigationChange={setNavigation} onSaved={refreshPreview} />}
              <PanelRealityMeta panel={activePanel} />
            </div>
          </div>
        </aside>

        <main className="relative flex flex-1 flex-col overflow-hidden bg-[var(--surface-1)]">
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-[color:var(--hairline)] bg-[var(--surface-0)] px-4">
            <div className="flex items-center gap-2 text-[11px] font-medium text-ink-5">
              <span className="text-ink-0">{currentSurface?.label ?? "Preview"}</span>
              <span>/</span>
              <span className="font-mono">{currentSurface?.path ?? publicPath}</span>
            </div>
            {previewSurface === "product" && !initialData.preview.product ? (
              <span className="text-[11px] text-ink-5">Agrega un producto publicado para previsualizar PDP.</span>
            ) : null}
          </div>

          <div className={cn("flex flex-1 overflow-hidden", device === "desktop" ? "p-2" : "items-center justify-center p-4")}>
            <div className={cn("relative overflow-hidden border border-[color:var(--hairline)] bg-white shadow-[var(--shadow-overlay)] transition-all duration-300", device === "desktop" ? "h-full w-full rounded-[var(--r-md)]" : "h-[720px] w-[390px] max-h-full max-w-full rounded-[var(--r-lg)]")}>
              {previewSrc ? (
                <iframe key={`${previewSurface}-${previewKey}`} ref={iframeRef} src={previewSrc} onLoad={handleIframeLoad} className="h-full w-full border-0" title={`Preview ${currentSurface?.label ?? "storefront"}`} />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <p className="text-[13px] text-ink-5">No hay una superficie disponible para previsualizar.</p>
                  <button type="button" onClick={refreshPreview} className="text-[11px] font-medium text-ink-0 underline underline-offset-4">Reintentar</button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <SectionEditorDrawer
        block={sectionEditorBlock}
        allBlocks={homeBlocks}
        isOpen={sectionEditorBlock !== null}
        onClose={() => setSectionEditorBlock(null)}
        onSaved={() => {
          setSectionEditorBlock(null);
          setPreviewSurface("home");
          refreshPreview();
        }}
      />

      <NexoraEditorChat
        onActionApplied={refreshPreview}
        onDeviceChange={(d) => { setDevice(d); }}
        onPreviewSurfaceChange={(s) => { setPreviewSurface(s); }}
        currentBranding={initialData.branding ? {
          primaryColor: initialData.branding.primaryColor,
          secondaryColor: initialData.branding.secondaryColor,
          fontFamily: initialData.branding.fontFamily,
          tone: initialData.branding.tone,
          buttonStyle: initialData.branding.buttonStyle,
        } : null}
      />
    </div>
  );
}

function ButtonsPanel({ initialData, onSaved }: { initialData: AdminStoreInitialData; onSaved: () => void }) {
  const [buttonStyle, setButtonStyle] = useState(initialData.branding?.buttonStyle ?? "rounded-sm");
  const [isPending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      await saveStoreBranding({ buttonStyle });
      onSaved();
    });
  };

  return (
    <div className="space-y-5">
      <PanelHeading title="Botones" description="Control real de la forma de CTAs en header, cart, home y checkout visual." />
      <Field label="Estilo de CTA">
        <div className="grid grid-cols-3 gap-2">
          {STORE_BUTTON_STYLES.map((style) => (
            <button key={style.value} type="button" onClick={() => setButtonStyle(style.value)} className={cn("h-10 border text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]", buttonStyle === style.value ? "border-ink-0 bg-ink-0 text-ink-12" : "border-[color:var(--hairline)] bg-[var(--surface-1)] text-ink-5 hover:bg-[var(--surface-2)] hover:text-ink-0")} style={{ borderRadius: style.radius }}>
              {style.label}
            </button>
          ))}
        </div>
      </Field>
      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Preview de boton</p>
        <button type="button" className="mt-3 h-10 w-full bg-ink-0 px-4 text-[12px] font-semibold text-ink-12" style={{ borderRadius: STORE_BUTTON_STYLES.find((style) => style.value === buttonStyle)?.radius }}>
          Agregar al carrito
        </button>
        <p className="mt-3 text-[11px] leading-[1.45] text-ink-5">Se guarda en StoreBranding.buttonStyle y se aplica por variable CSS en el storefront.</p>
      </div>
      <SaveButton isPending={isPending} onClick={save} />
    </div>
  );
}

function ColorsPanel({ initialData, onSaved }: { initialData: AdminStoreInitialData; onSaved: () => void }) {
  const [primary, setPrimary] = useState(initialData.branding?.primaryColor ?? "#07080d");
  const [secondary, setSecondary] = useState(initialData.branding?.secondaryColor ?? "#e9ecf3");
  const [isPending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      await saveStoreBranding({ primaryColor: primary, secondaryColor: secondary });
      onSaved();
    });
  };

  return (
    <div className="space-y-5">
      <PanelHeading title="Colores" description="Principal para CTAs y acentos; secundario para superficies suaves." />
      <ColorField label="Color principal" value={primary} onChange={setPrimary} />
      <ColorField label="Color secundario" value={secondary} onChange={setSecondary} />
      <div className="overflow-hidden rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
        <div className="h-16" style={{ background: secondary }} />
        <div className="space-y-3 bg-[var(--surface-0)] p-4">
          <div className="h-8 rounded-[var(--r-sm)]" style={{ background: primary }} />
          <p className="text-[11px] leading-[1.45] text-ink-5">El preview usa estos colores en botones, estados activos, logo textual y fondos de tienda.</p>
        </div>
      </div>
      <SaveButton isPending={isPending} onClick={save} />
    </div>
  );
}

function TypographyPanel({ initialData, onSaved }: { initialData: AdminStoreInitialData; onSaved: () => void }) {
  const [fontFamily, setFontFamily] = useState(initialData.branding?.fontFamily ?? "Inter");
  const [isPending, startTransition] = useTransition();
  const selected = resolveStoreFontOption(fontFamily);

  const save = () => {
    startTransition(async () => {
      await saveStoreBranding({ fontFamily });
      onSaved();
    });
  };

  return (
    <div className="space-y-5">
      <PanelHeading title="Tipografia" description="La fuente se guarda y se aplica al storefront real mediante variables CSS por tienda." />
      <div className="space-y-2">
        {STORE_FONT_OPTIONS.map((font) => (
          <button key={font.value} type="button" onClick={() => setFontFamily(font.value)} className={cn("w-full rounded-[var(--r-sm)] border p-3 text-left transition-colors focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]", selected.value === font.value ? "border-ink-0 bg-[var(--surface-0)] shadow-[var(--shadow-soft)]" : "border-[color:var(--hairline)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)]")}>
            <span className="block text-[18px] font-semibold tracking-[-0.03em] text-ink-0" style={{ fontFamily: font.displayStack }}>{font.label}</span>
            <span className="mt-1 block text-[12px] leading-[1.45] text-ink-5" style={{ fontFamily: font.bodyStack }}>{font.description} Aa 123</span>
          </button>
        ))}
      </div>
      <SaveButton isPending={isPending} onClick={save} />
    </div>
  );
}

function IdentityPanel({ initialData, onSaved }: { initialData: AdminStoreInitialData; onSaved: () => void }) {
  const [isPending, startTransition] = useTransition();
  const initialTone = STORE_TONES.some((option) => option.value === initialData.branding?.tone)
    ? initialData.branding?.tone
    : "professional";
  const [tone, setTone] = useState(initialTone ?? "professional");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      await saveStoreProfileAction(formData);
      await saveStoreBranding({ tone });
      onSaved();
    });
  };

  return (
    <form className="space-y-5" onSubmit={submit}>
      <PanelHeading title="Identidad" description="Datos reales usados por header, footer, SEO basico, URL publica y tono visual." />
      <Field label="Nombre de tienda">
        <input className={inputCls} name="name" defaultValue={initialData.store.name} required />
      </Field>
      <Field label="Slug publico">
        <input className={cn(inputCls, "font-mono")} name="slug" defaultValue={initialData.store.slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" />
      </Field>
      <Field label="Descripcion">
        <textarea className={textareaCls} name="description" defaultValue={initialData.store.description ?? ""} maxLength={280} />
      </Field>
      <input type="hidden" name="logo" defaultValue={initialData.branding?.logoUrl ?? initialData.store.logo ?? ""} />
      <Field label="Tono visual">
        <div className="space-y-2">
          {STORE_TONES.map((option) => (
            <button key={option.value} type="button" onClick={() => setTone(option.value)} className={cn("w-full rounded-[var(--r-sm)] border p-3 text-left transition-colors focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]", tone === option.value ? "border-ink-0 bg-ink-0 text-ink-12" : "border-[color:var(--hairline)] bg-[var(--surface-1)] text-ink-0 hover:bg-[var(--surface-2)]")}>
              <span className="block text-[12px] font-semibold">{option.label}</span>
              <span className={cn("mt-0.5 block text-[11px]", tone === option.value ? "text-ink-9" : "text-ink-5")}>{option.description}</span>
            </button>
          ))}
        </div>
      </Field>
      <SaveButton isPending={isPending} submit />
    </form>
  );
}

function MediaPanel({ initialData, onSaved }: { initialData: AdminStoreInitialData; onSaved: () => void }) {
  const [logoUrl, setLogoUrl] = useState(initialData.branding?.logoUrl ?? initialData.store.logo ?? "");
  const [isPending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      const normalizedLogo = logoUrl.trim();
      await saveStoreBranding({ logoUrl: normalizedLogo || null });
      onSaved();
    });
  };

  return (
    <div className="space-y-5">
      <PanelHeading title="Media" description="Logo visual usado por header y footer del storefront real." />
      <Field label="Logo URL">
        <input className={inputCls} value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} placeholder="https://..." type="url" />
      </Field>
      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Vista de marca</p>
        <div className="mt-3 flex h-20 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)]">
          {logoUrl.trim() ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl.trim()} alt="Logo de tienda" className="max-h-12 max-w-[220px] object-contain" />
          ) : (
            <span className="text-[18px] font-semibold tracking-[-0.03em] text-ink-0">{initialData.store.name}</span>
          )}
        </div>
        <p className="mt-3 text-[11px] leading-[1.45] text-ink-5">No modifica SEO ni datos legales: solo el logo visible persistido en StoreBranding.logoUrl.</p>
      </div>
      <SaveButton isPending={isPending} onClick={save} />
    </div>
  );
}

function NavigationPanel({
  mode,
  navigation,
  onNavigationChange,
  onSaved,
}: {
  mode: "header" | "footer";
  navigation: NavigationDraft[];
  onNavigationChange: (items: NavigationDraft[]) => void;
  onSaved: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const isFooter = mode === "footer";
  const belongsToPanel = (item: NavigationDraft) =>
    isFooter ? item.group.startsWith("footer") : item.group === "header";
  const editedItems = navigation
    .filter(belongsToPanel)
    .sort((a, b) => a.group.localeCompare(b.group) || a.sortOrder - b.sortOrder);
  const otherItems = navigation.filter((item) => !belongsToPanel(item));

  const updateItem = (id: string, patch: Partial<NavigationDraft>) => {
    onNavigationChange(navigation.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const addItem = () => {
    onNavigationChange([
      ...navigation,
      {
        id: createDraftId(),
        group: isFooter ? "footer_shop" : "header",
        label: "",
        href: isFooter ? "/legal" : "/store",
        sortOrder: editedItems.length,
        isVisible: true,
      },
    ]);
  };

  const removeItem = (id: string) => {
    onNavigationChange(navigation.filter((item) => item.id !== id));
  };

  const save = () => {
    startTransition(async () => {
      await saveStoreNavigation(normalizeNavigationForSave([...otherItems, ...editedItems]));
      onSaved();
    });
  };

  return (
    <div className="space-y-5">
      <PanelHeading
        title={isFooter ? "Pie de pagina" : "Encabezado"}
        description={isFooter ? "Edita los grupos y links visibles del footer." : "Edita la navegacion principal del header."}
      />
      <div className="space-y-2">
        {editedItems.map((item) => (
          <div key={item.id} className="space-y-2 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-3">
            <div className="flex items-center justify-between gap-2">
              {isFooter ? (
                <select className={cn(inputCls, "h-8 flex-1")} value={item.group} onChange={(event) => updateItem(item.id, { group: event.target.value })}>
                  <option value="footer_shop">Footer shop</option>
                  <option value="footer_support">Footer soporte</option>
                  <option value="footer_brand">Footer marca</option>
                </select>
              ) : (
                <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Menu principal</span>
              )}
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => updateItem(item.id, { isVisible: !item.isVisible })} className="rounded-[var(--r-sm)] p-1.5 text-ink-5 transition-colors hover:bg-[var(--surface-2)] hover:text-ink-0" aria-label={item.isVisible ? "Ocultar link" : "Mostrar link"}>
                  {item.isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </button>
                <button type="button" onClick={() => removeItem(item.id)} className="rounded-[var(--r-sm)] p-1.5 text-ink-5 transition-colors hover:bg-[var(--surface-2)] hover:text-[color:var(--signal-danger)]" aria-label="Eliminar link">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <input className={inputCls} value={item.label} onChange={(event) => updateItem(item.id, { label: event.target.value })} placeholder="Etiqueta" />
            <input className={cn(inputCls, "font-mono")} value={item.href} onChange={(event) => updateItem(item.id, { href: event.target.value })} placeholder="/store/mi-tienda/products" />
          </div>
        ))}
      </div>
      <button type="button" onClick={addItem} className="flex h-10 w-full items-center justify-center gap-2 rounded-[var(--r-sm)] border border-dashed border-[color:var(--hairline-strong)] bg-[var(--surface-1)] text-[12px] font-medium text-ink-5 transition-colors hover:bg-[var(--surface-2)] hover:text-ink-0">
        <Menu className="h-3.5 w-3.5" />
        Agregar link
      </button>
      <SaveButton isPending={isPending} onClick={save} />
    </div>
  );
}

function HomePanel({
  blocks,
  onBlocksChange,
  onEditBlock,
  onSaved,
}: {
  blocks: SectionBlock[];
  onBlocksChange: (blocks: SectionBlock[]) => void;
  onEditBlock: (block: SectionBlock) => void;
  onSaved: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const sorted = [...blocks].sort((a, b) => a.sortOrder - b.sortOrder);
  const visibleCount = sorted.filter((block) => block.isVisible).length;

  const saveBlocks = (nextBlocks: SectionBlock[]) => {
    onBlocksChange(nextBlocks);
    startTransition(async () => {
      await saveHomeBlocks(serializeBlocks(nextBlocks));
      onSaved();
    });
  };

  const toggle = (block: SectionBlock) => {
    saveBlocks(blocks.map((item) => (item.id === block.id ? { ...item, isVisible: !item.isVisible } : item)));
  };

  const move = (block: SectionBlock, direction: "up" | "down") => {
    const index = sorted.findIndex((item) => item.id === block.id);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sorted.length) return;

    const reordered = sorted.map((item, itemIndex) => {
      if (itemIndex === index) return { ...item, sortOrder: sorted[swapIndex].sortOrder };
      if (itemIndex === swapIndex) return { ...item, sortOrder: sorted[index].sortOrder };
      return item;
    });
    saveBlocks(reordered);
  };

  return (
    <div className="space-y-5">
      <PanelHeading title="Pagina de inicio" description={`${visibleCount} de ${sorted.length} bloques visibles. Edita contenido, orden y visibilidad.`} />
      <div className="space-y-2">
        {sorted.map((block, index) => (
          <div key={block.id} className={cn("rounded-[var(--r-md)] border p-3 transition-colors", block.isVisible ? "border-[color:var(--hairline)] bg-[var(--surface-1)]" : "border-dashed border-[color:var(--hairline)] bg-[var(--surface-1)] opacity-60")}>
            <div className="flex items-center gap-3">
              <div className="flex shrink-0 flex-col gap-0.5">
                <button type="button" disabled={index === 0 || isPending} onClick={() => move(block, "up")} className="rounded p-0.5 text-ink-6 hover:text-ink-0 disabled:opacity-30" aria-label="Mover arriba">
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button type="button" disabled={index === sorted.length - 1 || isPending} onClick={() => move(block, "down")} className="rounded p-0.5 text-ink-6 hover:text-ink-0 disabled:opacity-30" aria-label="Mover abajo">
                  <ArrowDown className="h-3 w-3" />
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold text-ink-0">{BLOCK_LABELS[block.blockType] ?? block.blockType}</p>
                <p className="mt-0.5 text-[10px] text-ink-5">{block.source} / {block.state}</p>
              </div>
              <button type="button" disabled={isPending} onClick={() => toggle(block)} className="rounded-[var(--r-sm)] p-1.5 text-ink-5 transition-colors hover:bg-[var(--surface-2)] hover:text-ink-0" aria-label={block.isVisible ? "Ocultar bloque" : "Mostrar bloque"}>
                {block.isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </button>
              <button type="button" onClick={() => onEditBlock(block)} className="inline-flex h-8 items-center gap-1.5 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-2.5 text-[11px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)]">
                <Pencil className="h-3 w-3" />
                Editar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-11 shrink-0 cursor-pointer rounded-[var(--r-xs)] border border-[color:var(--hairline)] p-0.5" />
        <input className={cn(inputCls, "font-mono")} value={value} onChange={(event) => onChange(event.target.value)} maxLength={7} placeholder="#07080d" />
      </div>
    </Field>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-medium text-ink-5">{label}</span>
      {children}
    </label>
  );
}

function PanelHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <p className={sectionTitle}>{title}</p>
      <p className="mt-1 text-[12px] leading-[1.45] text-ink-5">{description}</p>
    </div>
  );
}

function PanelRealityMeta({ panel }: { panel: EditorPanel }) {
  const meta = PANEL_META[panel];

  return (
    <div className="mt-auto rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Wiring real</p>
      <dl className="mt-3 grid grid-cols-1 gap-2 text-[11px]">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ink-5">Alcance</dt>
          <dd className="font-medium text-ink-0">{meta.scope}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ink-5">Modelo</dt>
          <dd className="max-w-[190px] truncate font-mono text-ink-0">{meta.model}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ink-5">Preview</dt>
          <dd className="font-medium capitalize text-ink-0">{meta.preview}</dd>
        </div>
      </dl>
    </div>
  );
}

function SaveButton({ isPending, onClick, submit = false }: { isPending: boolean; onClick?: () => void; submit?: boolean }) {
  return (
    <button type={submit ? "submit" : "button"} onClick={onClick} disabled={isPending} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[var(--r-sm)] bg-ink-0 px-4 text-[12px] font-semibold text-ink-12 transition-colors hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]">
      <Save className="h-3.5 w-3.5" />
      {isPending ? "Guardando..." : "Guardar cambios"}
    </button>
  );
}
