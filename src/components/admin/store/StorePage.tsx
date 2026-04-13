"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Copy,
  Eye,
  FileText,
  Globe,
  GripVertical,
  Home,
  Layers,
  Link2,
  Monitor,
  Navigation,
  Paintbrush,
  Palette,
  Save,
  Search,
  Smartphone,
  Store,
  X,
} from "lucide-react";

import { StoreDrawer } from "@/components/admin/store/StoreDrawer";
import { StoreStatusBadge, SectionTypeBadge, PageTypeBadge, NavGroupBadge, ColorDot } from "@/components/admin/store/StoreBadge";
import { DomainSettingsView } from "@/components/admin/store/tabs/DomainSettingsView";
import { TableSkeleton } from "@/components/admin/orders/TableSkeleton";
import { cn } from "@/lib/utils";
import {
  MOCK_THEMES,
  MOCK_BRANDING,
  MOCK_HOME_SECTIONS,
  MOCK_NAV_ITEMS,
  MOCK_PAGES,
  MOCK_DOMAIN,
  MOCK_PREVIEW,
  MOCK_STORE_SUMMARY,
} from "@/lib/mocks/store";
import { publishStoreAction, saveStoreBranding as saveStoreBrandingAction } from "@/lib/store-engine/actions";
import { addCustomDomain, setPrimaryDomain, removeCustomDomain, verifyDomainStatus } from "@/lib/store-engine/domains/actions";
import type { AdminStoreInitialData } from "@/types/store-engine";
import type { StoreTheme, StoreBranding, StoreSummary, HomeSection, NavItem, StorePage as StorePageType, StoreDomain, StoreStatus } from "@/types/store";

type TabValue = "resumen" | "tema" | "branding" | "home" | "navegacion" | "paginas" | "dominio" | "preview";
type VisualScenario = "live" | "empty" | "error";

type DrawerContent =
  | { kind: "theme"; data: StoreTheme }
  | { kind: "section"; data: HomeSection }
  | { kind: "nav"; data: NavItem }
  | { kind: "page"; data: StorePageType }
  | { kind: "domain"; data: StoreDomain };

interface ToastMessage { id: string; title: string; description: string; }

const timeFormatter = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export function StorePage({ initialData }: { initialData?: AdminStoreInitialData | null }) {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabValue) || "resumen";
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [visualScenario, setVisualScenario] = useState<VisualScenario>("live");
  const [isLoading, setIsLoading] = useState(true);
  const [drawerContent, setDrawerContent] = useState<DrawerContent | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // ─── Map persisted data to view models (mock fallback) ───
  const storeSummary: StoreSummary = initialData ? {
    themeName: initialData.theme?.activeTheme === "bold" ? "Bold Commerce" : initialData.theme?.activeTheme === "classic" ? "Classic Elegance" : "Minimal Pro",
    themeStatus: (initialData.theme?.isPublished ? "published" : "draft") as StoreStatus,
    hasLogo: !!initialData.branding?.logoUrl,
    primaryColor: initialData.branding?.primaryColor ?? "#111111",
    secondaryColor: initialData.branding?.secondaryColor ?? "#10B981",
    domain: initialData.store.primaryDomain ?? initialData.store.subdomain ?? "Sin dominio",
    publishStatus: (initialData.summary.lastPublishedAt ? "published" : "draft") as StoreStatus,
    pagesCount: initialData.pages.length,
    navItemsCount: initialData.navigation.length,
    homeSectionsCount: initialData.homeBlocks.length,
  } : MOCK_STORE_SUMMARY;

  const brandingData: StoreBranding = initialData?.branding ? {
    storeName: initialData.store.name,
    logoUrl: initialData.branding.logoUrl ?? "",
    faviconUrl: initialData.branding.faviconUrl ?? "",
    primaryColor: initialData.branding.primaryColor,
    secondaryColor: initialData.branding.secondaryColor,
    fontFamily: initialData.branding.fontFamily,
    buttonStyle: (initialData.branding.buttonStyle === "rounded-sm" ? "rounded" : initialData.branding.buttonStyle) as "rounded" | "square" | "pill",
  } : MOCK_BRANDING;

  const homeSections: HomeSection[] = initialData ? initialData.homeBlocks.map(b => ({
    id: b.id,
    type: (b.blockType === "featured_products" ? "featured-products" : b.blockType === "featured_categories" ? "categories" : b.blockType) as HomeSection["type"],
    label: blockLabel(b.blockType),
    status: (b.isVisible ? "active" : "hidden") as StoreStatus,
    order: b.sortOrder,
    description: `Bloque ${b.source} \u2013 ${b.state}`,
  })) : MOCK_HOME_SECTIONS;

  const navItems: NavItem[] = initialData ? initialData.navigation.map(n => ({
    id: n.id,
    label: n.label,
    destination: n.href,
    group: (n.group === "header" ? "main" : n.group.startsWith("footer") ? "footer" : "quick-links") as NavItem["group"],
    status: (n.isVisible ? "active" : "hidden") as StoreStatus,
    order: n.sortOrder,
  })) : MOCK_NAV_ITEMS;

  const storePages: StorePageType[] = initialData ? initialData.pages.map(p => ({
    id: p.id,
    name: p.title,
    slug: `/${p.slug}`,
    status: (p.status === "active" ? "published" : p.status) as StoreStatus,
    lastModified: p.updatedAt,
    type: p.type as "system" | "custom",
  })) : MOCK_PAGES;

  useEffect(() => { if (!isLoading) return; const t = window.setTimeout(() => setIsLoading(false), 720); return () => window.clearTimeout(t); }, [isLoading]);

  const tabs: Array<{ label: string; value: TabValue; icon: React.ReactNode }> = [
    { label: "Resumen", value: "resumen", icon: <Layers className="h-3.5 w-3.5" /> },
    { label: "Tema", value: "tema", icon: <Palette className="h-3.5 w-3.5" /> },
    { label: "Branding", value: "branding", icon: <Paintbrush className="h-3.5 w-3.5" /> },
    { label: "Home", value: "home", icon: <Home className="h-3.5 w-3.5" /> },
    { label: "Navegacion", value: "navegacion", icon: <Navigation className="h-3.5 w-3.5" /> },
    { label: "Paginas", value: "paginas", icon: <FileText className="h-3.5 w-3.5" /> },
    { label: "Dominio", value: "dominio", icon: <Globe className="h-3.5 w-3.5" /> },
    { label: "Vista previa", value: "preview", icon: <Monitor className="h-3.5 w-3.5" /> },
  ];

  const handleTabChange = (v: TabValue) => { if (v === activeTab) return; setActiveTab(v); setSearchQuery(""); setVisualScenario("live"); setIsLoading(true); };

  const pushToast = (title: string, description: string) => {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    setToasts((c) => [...c, { id, title, description }]);
    window.setTimeout(() => setToasts((c) => c.filter((t) => t.id !== id)), 3200);
  };

  const openDrawer = (c: DrawerContent) => setDrawerContent(c);
  const closeDrawer = () => setDrawerContent(null);
  const handleAction = (action: string) => { pushToast(action, "Accion simulada correctamente (mock)."); };

  const showToolbar = activeTab === "paginas" || activeTab === "navegacion";

  return (
    <div className="animate-in fade-in space-y-8 pb-32 duration-700">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#111111]">Mi Tienda</h1>
          <p className="mt-1 text-[15px] font-medium text-[#666666]">Apariencia, contenido y configuracion de tu tienda online.</p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-sm">
        <div aria-label="Secciones de tienda" className="flex items-center gap-8 overflow-x-auto border-b border-[#EAEAEA] bg-[#FAFAFA]/50 px-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" role="tablist">
          {tabs.map((tab) => (
            <button key={tab.value} aria-selected={activeTab === tab.value} className={cn("group relative whitespace-nowrap py-4 text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30", activeTab === tab.value ? "text-[#111111]" : "text-[#888888] hover:text-[#111111]")} onClick={() => handleTabChange(tab.value)} role="tab" type="button">
              <span className="flex items-center gap-2">{tab.icon}{tab.label}</span>
              {activeTab === tab.value ? <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-t-full bg-[#111111]" /> : null}
            </button>
          ))}
        </div>

        {showToolbar ? (
          <div className="flex flex-col gap-4 border-b border-[#EAEAEA] bg-white p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center">
              <div className="group relative w-full lg:max-w-sm">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-emerald-500" />
                <input aria-label="Buscar en la vista" className="w-full rounded-xl border border-transparent bg-gray-50 py-2.5 pl-10 pr-4 text-[13px] font-medium text-[#111111] transition-all placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar..." type="text" value={searchQuery} />
              </div>
              <ToolbarSelect icon={<AlertTriangle className="h-4 w-4" />} label="Escenario" onChange={(v) => setVisualScenario(v as VisualScenario)} options={["live", "empty", "error"]} value={visualScenario} />
            </div>
          </div>
        ) : null}

        <div className="min-h-[420px] bg-[#FAFAFA]/30" role="tabpanel">
          {isLoading ? (
            <TableSkeleton />
          ) : visualScenario === "error" && showToolbar ? (
            <ErrorState onRetry={() => setVisualScenario("live")} />
          ) : visualScenario === "empty" && showToolbar ? (
            <EmptyState onReset={() => setVisualScenario("live")} />
          ) : activeTab === "resumen" ? (
            <SummaryView onNavigate={handleTabChange} onAction={handleAction} summary={storeSummary} />
          ) : activeTab === "tema" ? (
            <ThemeView openDrawer={openDrawer} onAction={handleAction} />
          ) : activeTab === "branding" ? (
            <BrandingView onAction={handleAction} branding={brandingData} />
          ) : activeTab === "home" ? (
            <HomeView openDrawer={openDrawer} onAction={handleAction} sections={homeSections} />
          ) : activeTab === "navegacion" ? (
            <NavView searchQuery={searchQuery} openDrawer={openDrawer} onAction={handleAction} items={navItems} />
          ) : activeTab === "paginas" ? (
            <PagesView searchQuery={searchQuery} openDrawer={openDrawer} onAction={handleAction} pages={storePages} />
          ) : activeTab === "dominio" ? (
            <DomainSettingsView initialData={initialData!} onAction={handleAction} storeId={initialData?.store.id} />
          ) : (
            <PreviewView onAction={handleAction} />
          )}
        </div>
      </div>

      <StoreDrawer content={drawerContent} isOpen={drawerContent !== null} onClose={closeDrawer} onAction={handleAction} />
      <ToastViewport onDismiss={(id) => setToasts((c) => c.filter((t) => t.id !== id))} toasts={toasts} />
    </div>
  );
}

/* ─── Summary ─── */

function SummaryView({ onNavigate, onAction, summary }: { onNavigate: (t: TabValue) => void; onAction: (a: string) => void; summary: StoreSummary }) {
  const s = summary;

  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard label="Tema activo" value={s.themeName} accent />
        <SummaryCard label="Estado" value={s.themeStatus === "published" ? "Publicado" : "Borrador"} />
        <SummaryCard label="Dominio" value={s.domain} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Logo</p>
          <div className="mt-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 text-gray-400">
            {s.hasLogo ? <Check className="h-5 w-5 text-emerald-500" /> : <X className="h-5 w-5" />}
          </div>
        </div>
        <div className="rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Colores</p>
          <div className="mt-3 flex gap-2"><ColorDot color={s.primaryColor} /><ColorDot color={s.secondaryColor} /></div>
        </div>
        <SummaryCard label="Paginas" value={s.pagesCount.toString()} />
        <SummaryCard label="Secciones home" value={s.homeSectionsCount.toString()} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NavCard icon={<Palette className="h-5 w-5 text-purple-500" />} title="Tema" description={s.themeName} onClick={() => onNavigate("tema")} />
        <NavCard icon={<Paintbrush className="h-5 w-5 text-blue-500" />} title="Branding" description="Logo, colores, fuentes" onClick={() => onNavigate("branding")} />
        <NavCard icon={<Home className="h-5 w-5 text-emerald-500" />} title="Home" description={`${s.homeSectionsCount} secciones`} onClick={() => onNavigate("home")} />
        <NavCard icon={<Globe className="h-5 w-5 text-amber-500" />} title="Dominio" description={s.domain} onClick={() => onNavigate("dominio")} />
      </div>

      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 rounded-xl bg-[#111111] px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={async () => { try { await publishStoreAction(); onAction("Tienda publicada correctamente"); } catch { onAction("Error al publicar tienda"); } }} type="button">
          <Eye className="h-3.5 w-3.5" />
          Publicar tienda
        </button>
        <button className="flex items-center gap-2 rounded-xl border border-[#EAEAEA] bg-white px-5 py-2.5 text-[13px] font-bold text-[#111111] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={() => onNavigate("preview")} type="button">
          Ver vista previa
        </button>
      </div>
    </div>
  );
}

/* ─── Theme ─── */

function ThemeView({ openDrawer, onAction }: { openDrawer: (c: DrawerContent) => void; onAction: (a: string) => void }) {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Temas disponibles</h3>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {MOCK_THEMES.map((theme) => (
          <button key={theme.id} className="group rounded-2xl border border-[#EAEAEA] bg-white p-0 text-left shadow-sm transition-all hover:border-gray-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={() => openDrawer({ kind: "theme", data: theme })} type="button">
            <div className="flex h-28 items-end gap-1 rounded-t-2xl bg-gradient-to-br from-gray-50 to-gray-100 p-4">
              {theme.previewColors.map((c) => (
                <div key={c} className="h-full w-8 rounded-lg shadow-sm" style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="space-y-2 p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-[#111111]">{theme.name}</p>
                <StoreStatusBadge status={theme.status} />
              </div>
              <p className="line-clamp-2 text-xs font-medium text-gray-500">{theme.description}</p>
              <p className="text-[11px] font-bold tabular-nums text-gray-400">v{theme.version} · {timeFormatter.format(new Date(theme.lastModified))}</p>
            </div>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 rounded-xl border border-[#EAEAEA] bg-white px-5 py-2.5 text-[13px] font-bold text-[#111111] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={() => onAction("Tema restablecido (mock)")} type="button">
          Restablecer tema
        </button>
      </div>
    </div>
  );
}

/* ─── Branding ─── */

function BrandingView({ onAction, branding }: { onAction: (a: string) => void; branding: StoreBranding }) {
  const b = branding;

  return (
    <div className="space-y-8 p-6">
      <div className="space-y-4">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Identidad de marca</h3>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <FormBlock label="Nombre de la tienda" value={b.storeName} />
          <FormBlock label="Tipografia" value={b.fontFamily} />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Imagenes</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm">
            <p className="text-xs font-bold text-[#111111]">Logo</p>
            <div className="mt-3 flex h-20 w-full items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-xs font-medium text-gray-400">
              {b.logoUrl ? "logo-techstore.png" : "Sin logo"}
            </div>
            <button className="mt-3 text-[13px] font-bold text-emerald-600 transition-colors hover:text-emerald-700" onClick={() => onAction("Logo subido (mock)")} type="button">Cambiar logo</button>
          </div>
          <div className="rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm">
            <p className="text-xs font-bold text-[#111111]">Favicon</p>
            <div className="mt-3 flex h-20 w-full items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-xs font-medium text-gray-400">
              {b.faviconUrl ? "favicon-techstore.png" : "Sin favicon"}
            </div>
            <button className="mt-3 text-[13px] font-bold text-emerald-600 transition-colors hover:text-emerald-700" onClick={() => onAction("Favicon subido (mock)")} type="button">Cambiar favicon</button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Colores</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ColorField label="Color principal" color={b.primaryColor} onAction={onAction} />
          <ColorField label="Color secundario" color={b.secondaryColor} onAction={onAction} />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Estilo de botones</h3>
        <div className="flex gap-3">
          {(["rounded", "square", "pill"] as const).map((style) => (
            <button key={style} className={cn("rounded-xl border px-5 py-2.5 text-[13px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30", style === b.buttonStyle ? "border-[#111111] bg-[#111111] text-white" : "border-[#EAEAEA] bg-white text-[#111111] hover:bg-gray-50")} onClick={() => onAction(`Estilo ${style} aplicado (mock)`)} type="button">
              {style === "rounded" ? "Redondeado" : style === "square" ? "Cuadrado" : "Pill"}
            </button>
          ))}
        </div>
      </div>

      <button className="flex items-center gap-2 rounded-xl bg-[#111111] px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={async () => { try { await saveStoreBrandingAction({ primaryColor: b.primaryColor, secondaryColor: b.secondaryColor, fontFamily: b.fontFamily, buttonStyle: b.buttonStyle, logoUrl: b.logoUrl || null, faviconUrl: b.faviconUrl || null }); onAction("Branding guardado correctamente"); } catch { onAction("Error al guardar branding"); } }} type="button">
        <Save className="h-3.5 w-3.5" />
        Guardar branding
      </button>
    </div>
  );
}

/* ─── Home ─── */

function HomeView({ openDrawer, onAction, sections }: { openDrawer: (c: DrawerContent) => void; onAction: (a: string) => void; sections: HomeSection[] }) {
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Secciones del home</h3>
        <span className="text-xs font-bold text-gray-400">{sections.length} secciones</span>
      </div>
      <div className="space-y-2">
        {sections.map((sec) => (
          <button key={sec.id} className="group flex w-full items-center gap-4 rounded-2xl border border-[#EAEAEA] bg-white p-4 text-left shadow-sm transition-all hover:border-gray-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={() => openDrawer({ kind: "section", data: sec })} type="button">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-400 transition-colors group-hover:bg-gray-100">
              <GripVertical className="h-4 w-4" />
            </div>
            <div className="flex flex-1 items-center justify-between gap-3 min-w-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#111111]">{sec.label}</p>
                <p className="mt-0.5 truncate text-xs font-medium text-gray-500">{sec.description}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <SectionTypeBadge type={sec.type} />
                <StoreStatusBadge status={sec.status} />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Navigation ─── */

function NavView({ searchQuery, openDrawer, onAction, items }: { searchQuery: string; openDrawer: (c: DrawerContent) => void; onAction: (a: string) => void; items: NavItem[] }) {
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((n) => !q || n.label.toLowerCase().includes(q) || n.destination.toLowerCase().includes(q));
  }, [searchQuery, items]);

  if (filtered.length === 0) return <NoResultsState onReset={() => {}} />;

  const groups: Array<{ key: string; label: string; items: NavItem[] }> = [
    { key: "main", label: "Menu principal", items: filtered.filter((n) => n.group === "main") },
    { key: "footer", label: "Footer", items: filtered.filter((n) => n.group === "footer") },
    { key: "quick-links", label: "Links rapidos", items: filtered.filter((n) => n.group === "quick-links") },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6 p-6">
      {groups.map((group) => (
        <div key={group.key} className="space-y-2">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">{group.label}</h3>
          {group.items.map((item) => (
            <button key={item.id} className="group flex w-full items-center gap-4 rounded-2xl border border-[#EAEAEA] bg-white p-4 text-left shadow-sm transition-all hover:border-gray-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={() => openDrawer({ kind: "nav", data: item })} type="button">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-400 transition-colors group-hover:bg-gray-100">
                <Link2 className="h-4 w-4" />
              </div>
              <div className="flex flex-1 items-center justify-between gap-3 min-w-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#111111]">{item.label}</p>
                  <p className="mt-0.5 truncate text-xs font-mono font-medium text-gray-400">{item.destination}</p>
                </div>
                <StoreStatusBadge status={item.status} />
              </div>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─── Pages ─── */

function PagesView({ searchQuery, openDrawer, onAction, pages }: { searchQuery: string; openDrawer: (c: DrawerContent) => void; onAction: (a: string) => void; pages: StorePageType[] }) {
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return pages.filter((p) => !q || p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q));
  }, [searchQuery, pages]);

  if (filtered.length === 0) return <NoResultsState onReset={() => {}} />;

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left">
          <thead>
            <tr className="border-b border-[#EAEAEA] bg-[#FAFAFA]/70">
              <TableHead label="Nombre" />
              <TableHead label="Slug" />
              <TableHead label="Tipo" />
              <TableHead label="Modificada" />
              <TableHead label="Estado" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAEAEA]/80">
            {filtered.map((p) => (
              <tr key={p.id} className="group cursor-pointer bg-white transition-colors hover:bg-gray-50/60 focus-within:bg-gray-50/80" onClick={() => openDrawer({ kind: "page", data: p })} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrawer({ kind: "page", data: p }); } }}>
                <td className="px-6 py-4 text-sm font-bold text-[#111111]">{p.name}</td>
                <td className="px-6 py-4 text-xs font-mono font-medium text-gray-500">{p.slug}</td>
                <td className="px-6 py-4"><PageTypeBadge type={p.type} /></td>
                <td className="px-6 py-4 text-xs font-bold tabular-nums text-gray-500">{timeFormatter.format(new Date(p.lastModified))}</td>
                <td className="px-6 py-4"><StoreStatusBadge status={p.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-[#EAEAEA] bg-[#FAFAFA]/50 px-6 py-4">
        <span className="block text-xs font-bold uppercase tracking-[0.18em] text-[#888888]">Mostrando <b className="px-1 text-[#111111]">{filtered.length}</b> de {pages.length}</span>
      </div>
    </div>
  );
}



/* ─── Preview ─── */

function PreviewView({ onAction }: { onAction: (a: string) => void }) {
  const p = MOCK_PREVIEW;

  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SummaryCard label="Estado" value={p.status === "published" ? "Publicado" : "Borrador"} accent />
        <SummaryCard label="Publicado" value={timeFormatter.format(new Date(p.publishedAt))} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#EAEAEA] bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[#EAEAEA] bg-[#FAFAFA]/50 px-5 py-3">
            <Monitor className="h-4 w-4 text-gray-400" />
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Desktop</span>
          </div>
          <div className="flex h-48 items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="space-y-2 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm"><Monitor className="h-5 w-5 text-gray-400" /></div>
              <p className="text-xs font-bold text-gray-500">Vista desktop</p>
              <p className="text-[11px] font-medium text-gray-400">1440 × 900</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#EAEAEA] bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[#EAEAEA] bg-[#FAFAFA]/50 px-5 py-3">
            <Smartphone className="h-4 w-4 text-gray-400" />
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Mobile</span>
          </div>
          <div className="flex h-48 items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="space-y-2 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm"><Smartphone className="h-5 w-5 text-gray-400" /></div>
              <p className="text-xs font-bold text-gray-500">Vista mobile</p>
              <p className="text-[11px] font-medium text-gray-400">375 × 812</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button className="flex items-center gap-2 rounded-xl bg-[#111111] px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={() => onAction("Publicacion simulada")} type="button">
          <Eye className="h-3.5 w-3.5" />
          Publicar cambios
        </button>
        <button className="flex items-center gap-2 rounded-xl border border-[#EAEAEA] bg-white px-5 py-2.5 text-[13px] font-bold text-[#111111] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={() => onAction("Preview abierto (mock)")} type="button">
          <Monitor className="h-3.5 w-3.5" />
          Abrir preview
        </button>
      </div>
    </div>
  );
}

/* ─── Shared ─── */

function SummaryCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-2xl border border-[#EAEAEA] p-5 shadow-sm", accent ? "bg-[#111111]" : "bg-white")}>
      <p className={cn("text-[11px] font-bold uppercase tracking-[0.18em]", accent ? "text-gray-400" : "text-[#888888]")}>{label}</p>
      <p className={cn("mt-2 truncate text-2xl font-black tracking-tight", accent ? "text-white" : "text-[#111111]")} title={value}>{value}</p>
    </div>
  );
}

function NavCard({ icon, title, description, onClick }: { icon: React.ReactNode; title: string; description: string; onClick: () => void }) {
  return (
    <button className="group flex items-start gap-4 rounded-2xl border border-[#EAEAEA] bg-white p-5 text-left shadow-sm transition-all hover:border-gray-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={onClick} type="button">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 transition-colors group-hover:bg-gray-100">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-[#111111]">{title}</p>
        <p className="mt-1 truncate text-xs font-medium text-gray-500">{description}</p>
      </div>
      <span className="ml-auto shrink-0 text-gray-300 transition-colors group-hover:text-[#111111]">→</span>
    </button>
  );
}

function FormBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm">
      <p className="text-xs font-bold text-[#111111]">{label}</p>
      <p className="mt-2 text-sm font-medium text-gray-500">{value}</p>
    </div>
  );
}

function ColorField({ label, color, onAction }: { label: string; color: string; onAction: (a: string) => void }) {
  return (
    <div className="rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm">
      <p className="text-xs font-bold text-[#111111]">{label}</p>
      <div className="mt-3 flex items-center gap-3">
        <ColorDot color={color} />
        <span className="font-mono text-xs font-bold text-gray-500">{color}</span>
      </div>
      <button className="mt-3 text-[13px] font-bold text-emerald-600 transition-colors hover:text-emerald-700" onClick={() => onAction(`Color ${label} cambiado (mock)`)} type="button">Cambiar</button>
    </div>
  );
}

function ToolbarSelect({ icon, label, onChange, options, value }: { icon: React.ReactNode; label: string; onChange: (v: string) => void; options: string[]; value: string }) {
  return (
    <label className="flex min-w-[170px] items-center gap-2 rounded-xl border border-[#EAEAEA] bg-white px-3 py-2.5 text-[13px] font-bold text-gray-600 shadow-sm">
      <span className="shrink-0 text-gray-400">{icon}</span>
      <span className="text-[#666666]">{label}</span>
      <select className="w-full bg-transparent text-right font-semibold text-[#111111] outline-none" onChange={(e) => onChange(e.target.value)} value={value}>
        {options.map((o) => <option key={o} value={o}>{selectLabel(o)}</option>)}
      </select>
    </label>
  );
}

function TableHead({ label }: { label: string }) {
  return <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">{label}</th>;
}

function NoResultsState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-gray-100 bg-gray-50 shadow-sm"><Search className="h-8 w-8 text-gray-300" /></div>
      <h3 className="text-xl font-extrabold text-[#111111]">No encontramos resultados</h3>
      <p className="mt-2 max-w-md text-[15px] font-medium text-[#888888]">Ajusta la busqueda y vuelve a intentarlo.</p>
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-gray-100 bg-gray-50 shadow-sm"><Store className="h-8 w-8 text-gray-300" /></div>
      <h3 className="text-xl font-extrabold text-[#111111]">Todavia no hay datos en esta vista</h3>
      <p className="mt-2 max-w-md text-[15px] font-medium text-[#888888]">Estado vacio simulado para QA.</p>
      <button className="mt-6 rounded-xl border border-[#EAEAEA] bg-white px-6 py-2.5 text-[13px] font-bold text-[#111111] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={onReset} type="button">Volver a la muestra</button>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-red-100 bg-red-50 shadow-sm"><AlertTriangle className="h-8 w-8 text-red-400" /></div>
      <h3 className="text-xl font-extrabold text-[#111111]">No pudimos cargar los datos</h3>
      <p className="mt-2 max-w-md text-[15px] font-medium text-[#888888]">Estado simulado para QA visual.</p>
      <button className="mt-6 rounded-xl bg-[#111111] px-6 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={onRetry} type="button">Reintentar</button>
    </div>
  );
}

function ToastViewport({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div aria-live="polite" className="fixed right-6 top-20 z-[60] flex w-full max-w-sm flex-col gap-3">
      {toasts.map((t) => (
        <div key={t.id} className="rounded-2xl border border-[#EAEAEA] bg-white p-4 shadow-xl animate-in slide-in-from-right-5 fade-in duration-300">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-sm font-bold text-[#111111]">{t.title}</p><p className="mt-1 text-sm font-medium text-gray-500">{t.description}</p></div>
            <button aria-label="Cerrar" className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#111111]" onClick={() => onDismiss(t.id)} type="button"><X className="h-4 w-4" /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

function selectLabel(v: string): string {
  switch (v) {
    case "live": return "Operativa";
    case "empty": return "Vacio";
    case "error": return "Error";
    default: return v;
  }
}

function blockLabel(blockType: string): string {
  const labels: Record<string, string> = {
    hero: "Hero principal",
    featured_products: "Productos destacados",
    featured_categories: "Categorias",
    benefits: "Beneficios",
    testimonials: "Testimonios",
    faq: "Preguntas frecuentes",
    newsletter: "Newsletter",
  };
  return labels[blockType] ?? blockType;
}
