"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Check,
  CreditCard,
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
  Share2,
  Smartphone,
  X,
} from "lucide-react";

import { StoreDrawer } from "@/components/admin/store/StoreDrawer";
import { StoreStatusBadge, SectionTypeBadge, PageTypeBadge, ColorDot } from "@/components/admin/store/StoreBadge";
import { DomainSettingsView } from "@/components/admin/store/tabs/DomainSettingsView";
import { TableSkeleton } from "@/components/admin/orders/TableSkeleton";
import { cn } from "@/lib/utils";

import {
  createFirstStoreProductAction,
  publishStoreAction,
  saveStoreProfileAction,
} from "@/lib/store-engine/actions";
import type { AdminStoreInitialData } from "@/types/store-engine";
import type { StoreTheme, StoreBranding, StoreSummary, HomeSection, NavItem, StorePage as StorePageType, StoreDomain, StoreStatus } from "@/types/store";

type TabValue = "resumen" | "tema" | "branding" | "home" | "navegacion" | "paginas" | "dominio" | "pagos" | "preview";

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
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const initialTab: TabValue = tabParam === "tema" || tabParam === "branding" || tabParam === "home" || tabParam === "navegacion" || tabParam === "paginas" || tabParam === "dominio" || tabParam === "pagos" || tabParam === "preview" ? tabParam : "resumen";
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
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
  } : {
    themeName: "Sin configuración",
    themeStatus: "draft",
    hasLogo: false,
    primaryColor: "#111111",
    secondaryColor: "#10B981",
    domain: "Sin configurar",
    publishStatus: "draft",
    pagesCount: 0,
    navItemsCount: 0,
    homeSectionsCount: 0,
  };

  const brandingData: StoreBranding = initialData?.branding ? {
    storeName: initialData.store.name,
    logoUrl: initialData.branding.logoUrl ?? "",
    faviconUrl: initialData.branding.faviconUrl ?? "",
    primaryColor: initialData.branding.primaryColor,
    secondaryColor: initialData.branding.secondaryColor,
    fontFamily: initialData.branding.fontFamily,
    buttonStyle: (initialData.branding.buttonStyle === "rounded-sm" ? "rounded" : initialData.branding.buttonStyle) as "rounded" | "square" | "pill",
  } : {
    storeName: "Nueva Tienda",
    logoUrl: "",
    faviconUrl: "",
    primaryColor: "#111111",
    secondaryColor: "#10B981",
    fontFamily: "Inter",
    buttonStyle: "rounded",
  };

  const homeSections: HomeSection[] = initialData ? initialData.homeBlocks.map(b => ({
    id: b.id,
    type: (b.blockType === "featured_products" ? "featured-products" : b.blockType === "featured_categories" ? "categories" : b.blockType) as HomeSection["type"],
    label: blockLabel(b.blockType),
    status: (b.isVisible ? "active" : "hidden") as StoreStatus,
    order: b.sortOrder,
    description: `Bloque ${b.source} \u2013 ${b.state}`,
  })) : [];

  const navItems: NavItem[] = initialData ? initialData.navigation.map(n => ({
    id: n.id,
    label: n.label,
    destination: n.href,
    group: (n.group === "header" ? "main" : n.group.startsWith("footer") ? "footer" : "quick-links") as NavItem["group"],
    status: (n.isVisible ? "active" : "hidden") as StoreStatus,
    order: n.sortOrder,
  })) : [];

  const storePages: StorePageType[] = initialData ? initialData.pages.map(p => ({
    id: p.id,
    name: p.title,
    slug: `/${p.slug}`,
    status: (p.status === "active" ? "published" : p.status) as StoreStatus,
    lastModified: p.updatedAt,
    type: p.type as "system" | "custom",
  })) : [];

  const publicPath = initialData?.publicUrl ?? (initialData ? `/store/${initialData.store.slug}` : "#");
  const publicUrl = typeof window === "undefined" || publicPath === "#" ? publicPath : `${window.location.origin}${publicPath}`;
  const paymentStatus = initialData?.paymentProvider?.status ?? "disconnected";
  const isMercadoPagoConnected = paymentStatus === "connected" && !!initialData?.paymentProvider;
  const isLive = initialData?.store.status === "active" && (initialData?.counts.sellableProducts ?? 0) > 0;

  useEffect(() => { if (!isLoading) return; const t = window.setTimeout(() => setIsLoading(false), 720); return () => window.clearTimeout(t); }, [isLoading]);

  const tabs: Array<{ label: string; value: TabValue; icon: React.ReactNode }> = [
    { label: "Resumen", value: "resumen", icon: <Layers className="h-3.5 w-3.5" /> },
    { label: "Tema", value: "tema", icon: <Palette className="h-3.5 w-3.5" /> },
    { label: "Branding", value: "branding", icon: <Paintbrush className="h-3.5 w-3.5" /> },
    { label: "Home", value: "home", icon: <Home className="h-3.5 w-3.5" /> },
    { label: "Navegacion", value: "navegacion", icon: <Navigation className="h-3.5 w-3.5" /> },
    { label: "Paginas", value: "paginas", icon: <FileText className="h-3.5 w-3.5" /> },
    { label: "Dominio", value: "dominio", icon: <Globe className="h-3.5 w-3.5" /> },
    { label: "Pagos", value: "pagos", icon: <CreditCard className="h-3.5 w-3.5" /> },
    { label: "Vista previa", value: "preview", icon: <Monitor className="h-3.5 w-3.5" /> },
  ];

  const handleTabChange = (v: TabValue) => { if (v === activeTab) return; setActiveTab(v); setSearchQuery(""); setIsLoading(true); };

  const pushToast = (title: string, description: string) => {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    setToasts((c) => [...c, { id, title, description }]);
    window.setTimeout(() => setToasts((c) => c.filter((t) => t.id !== id)), 3200);
  };

  useEffect(() => {
    const mp = searchParams.get("mp");
    if (!mp) return;

    if (mp === "connected") {
      pushToast("Mercado Pago conectado", "El checkout de la tienda quedo habilitado para pagos reales.");
    } else if (mp === "missing_config") {
      pushToast("Falta configuracion", "MP_CLIENT_ID, MP_CLIENT_SECRET o NEXT_PUBLIC_APP_URL no estan configurados.");
    } else if (mp === "invalid_state") {
      pushToast("Conexion rechazada", "La respuesta OAuth no pertenece a esta sesion.");
    } else if (mp === "error") {
      pushToast("No se pudo conectar", "Mercado Pago no devolvio credenciales validas.");
    }
  }, [searchParams]);

  const openDrawer = (c: DrawerContent) => setDrawerContent(c);
  const closeDrawer = () => setDrawerContent(null);
  const refreshData = () => router.refresh();
  const handleAction = (action: string) => { pushToast("Información", action); };

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
            </div>
          </div>
        ) : null}

        <div className="min-h-[420px] bg-[#FAFAFA]/30" role="tabpanel">
          {isLoading ? (
            <TableSkeleton />
          ) : activeTab === "resumen" ? (
            <SummaryView
              initialData={initialData ?? null}
              isLive={isLive}
              isMercadoPagoConnected={isMercadoPagoConnected}
              onAction={handleAction}
              onNavigate={handleTabChange}
              onRefresh={refreshData}
              publicPath={publicPath}
              publicUrl={publicUrl}
              summary={storeSummary}
            />
          ) : activeTab === "tema" ? (
            <ThemeView openDrawer={openDrawer} onAction={handleAction} />
          ) : activeTab === "branding" ? (
            <BrandingView initialData={initialData ?? null} onAction={handleAction} onRefresh={refreshData} branding={brandingData} />
          ) : activeTab === "home" ? (
            <HomeView openDrawer={openDrawer} onAction={handleAction} sections={homeSections} />
          ) : activeTab === "navegacion" ? (
            <NavView searchQuery={searchQuery} openDrawer={openDrawer} onAction={handleAction} items={navItems} />
          ) : activeTab === "paginas" ? (
            <PagesView searchQuery={searchQuery} openDrawer={openDrawer} onAction={handleAction} pages={storePages} />
          ) : activeTab === "dominio" ? (
            <DomainSettingsView initialData={initialData!} onAction={handleAction} storeId={initialData?.store.id} />
          ) : activeTab === "pagos" ? (
            <PaymentsView initialData={initialData ?? null} isConnected={isMercadoPagoConnected} onAction={handleAction} publicPath={publicPath} />
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

function SummaryView({
  initialData,
  isLive,
  isMercadoPagoConnected,
  onNavigate,
  onAction,
  onRefresh,
  publicPath,
  publicUrl,
  summary,
}: {
  initialData: AdminStoreInitialData | null;
  isLive: boolean;
  isMercadoPagoConnected: boolean;
  onNavigate: (t: TabValue) => void;
  onAction: (a: string) => void;
  onRefresh: () => void;
  publicPath: string;
  publicUrl: string;
  summary: StoreSummary;
}) {
  const s = summary;
  const [isPublishing, startPublishing] = useTransition();
  const productCount = initialData?.counts.products ?? 0;
  const sellableProducts = initialData?.counts.sellableProducts ?? 0;

  const handlePublish = () => {
    startPublishing(async () => {
      try {
        await publishStoreAction();
        onAction("Tienda publicada correctamente.");
        onRefresh();
      } catch (error) {
        onAction(error instanceof Error ? error.message : "No se pudo publicar la tienda.");
      }
    });
  };

  const handleShare = async () => {
    if (!isLive) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      onAction("Link publico copiado.");
    } catch {
      onAction("No se pudo copiar el link automaticamente.");
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard label="Tema activo" value={s.themeName} accent />
        <SummaryCard label="Estado" value={isLive ? "Live" : "Borrador"} />
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">URL publica</p>
              <p className="mt-2 break-all font-mono text-sm font-semibold text-[#111111]">{publicPath}</p>
              <p className="mt-2 text-[12px] font-medium text-[#777777]">
                {isLive
                  ? isMercadoPagoConnected
                    ? "La tienda esta publicada y el checkout esta habilitado con la cuenta MP conectada."
                    : "La tienda esta publicada. El checkout queda desactivado hasta conectar Mercado Pago."
                  : "La URL queda activa cuando publiques una tienda con productos disponibles."}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {isLive ? (
                <Link className="inline-flex items-center gap-2 rounded-xl bg-[#111111] px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" href={publicPath} target="_blank">
                  <Eye className="h-3.5 w-3.5" />
                  Ver mi tienda
                </Link>
              ) : (
                <button className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-[#111111] px-4 py-2.5 text-[13px] font-bold text-white opacity-40" disabled type="button">
                  <Eye className="h-3.5 w-3.5" />
                  Ver mi tienda
                </button>
              )}
              <button className="inline-flex items-center gap-2 rounded-xl border border-[#EAEAEA] bg-white px-4 py-2.5 text-[13px] font-bold text-[#111111] transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" disabled={!isLive} onClick={handleShare} type="button">
                <Share2 className="h-3.5 w-3.5" />
                Compartir tienda
              </button>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Checkout</p>
          <p className={cn("mt-2 text-sm font-black", isMercadoPagoConnected ? "text-emerald-700" : "text-amber-700")}>
            {isMercadoPagoConnected ? "Mercado Pago conectado" : "Mercado Pago pendiente"}
          </p>
          <p className="mt-2 text-[12px] font-medium leading-relaxed text-[#777777]">
            {isMercadoPagoConnected ? "Las compras redirigen a la cuenta propia del dueno de la tienda." : "La tienda se puede preparar y publicar, pero no cobra hasta conectar una cuenta real."}
          </p>
          <button className="mt-4 text-[12px] font-bold text-[#111111] underline underline-offset-4" onClick={() => onNavigate("pagos")} type="button">
            Revisar pagos
          </button>
        </div>
      </div>

      {productCount === 0 ? (
        <FirstProductPanel onAction={onAction} onRefresh={onRefresh} />
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NavCard icon={<Palette className="h-5 w-5 text-purple-500" />} title="Tema" description={s.themeName} onClick={() => onNavigate("tema")} />
        <NavCard icon={<Paintbrush className="h-5 w-5 text-blue-500" />} title="Branding" description="Logo, colores, fuentes" onClick={() => onNavigate("branding")} />
        <NavCard icon={<Home className="h-5 w-5 text-emerald-500" />} title="Home" description={`${s.homeSectionsCount} secciones`} onClick={() => onNavigate("home")} />
        <NavCard icon={<Globe className="h-5 w-5 text-amber-500" />} title="Dominio" description={s.domain} onClick={() => onNavigate("dominio")} />
      </div>

      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 rounded-xl bg-[#111111] px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" disabled={isPublishing || sellableProducts === 0} onClick={handlePublish} type="button">
          <Eye className="h-3.5 w-3.5" />
          {isPublishing ? "Publicando..." : "Publicar tienda"}
        </button>
        <button className="flex items-center gap-2 rounded-xl border border-[#EAEAEA] bg-white px-5 py-2.5 text-[13px] font-bold text-[#111111] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={() => onNavigate("preview")} type="button">
          Ver vista previa
        </button>
      </div>
    </div>
  );
}

function FirstProductPanel({ onAction, onRefresh }: { onAction: (a: string) => void; onRefresh: () => void }) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        await createFirstStoreProductAction(formData);
        form.reset();
        onAction("Primer producto creado con variante, precio y stock.");
        onRefresh();
      } catch (error) {
        onAction(error instanceof Error ? error.message : "No se pudo crear el producto.");
      }
    });
  };

  return (
    <form className="rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Primer producto</p>
          <h3 className="mt-2 text-lg font-black tracking-tight text-[#111111]">Carga un SKU vendible</h3>
          <p className="mt-1 max-w-xl text-[13px] font-medium leading-relaxed text-[#777777]">
            Crea un producto real en la DB con una variante, precio y stock. Despues podes editarlo desde Catalogo e Inventario.
          </p>
        </div>
        <button className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#111111] px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" disabled={isPending} type="submit">
          <Save className="h-3.5 w-3.5" />
          {isPending ? "Creando..." : "Crear producto"}
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <input className="rounded-xl border border-[#EAEAEA] bg-white px-3 py-2.5 text-sm font-medium text-[#111111] outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" name="title" placeholder="Nombre del producto" required />
        <input className="rounded-xl border border-[#EAEAEA] bg-white px-3 py-2.5 text-sm font-medium text-[#111111] outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" name="variantTitle" placeholder="Variante, ej. Default" />
        <input className="rounded-xl border border-[#EAEAEA] bg-white px-3 py-2.5 text-sm font-medium text-[#111111] outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" min="1" name="price" placeholder="Precio" required step="0.01" type="number" />
        <input className="rounded-xl border border-[#EAEAEA] bg-white px-3 py-2.5 text-sm font-medium text-[#111111] outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" min="0" name="stock" placeholder="Stock" required step="1" type="number" />
        <input className="rounded-xl border border-[#EAEAEA] bg-white px-3 py-2.5 text-sm font-medium text-[#111111] outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 md:col-span-2" name="category" placeholder="Categoria" />
        <input className="rounded-xl border border-[#EAEAEA] bg-white px-3 py-2.5 text-sm font-medium text-[#111111] outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 md:col-span-2" name="featuredImage" placeholder="URL de imagen publica" type="url" />
        <textarea className="min-h-24 rounded-xl border border-[#EAEAEA] bg-white px-3 py-2.5 text-sm font-medium text-[#111111] outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 md:col-span-2 xl:col-span-4" name="description" placeholder="Descripcion breve" />
      </div>
    </form>
  );
}

/* ─── Theme ─── */

function ThemeView({ openDrawer, onAction }: { openDrawer: (c: DrawerContent) => void; onAction: (a: string) => void }) {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Temas disponibles</h3>
      </div>
      <div className="flex h-32 items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-xs font-medium text-gray-400">
        Gestión de temas en construcción
      </div>
      <div className="flex items-center gap-3">
        <button disabled className="flex items-center gap-2 rounded-xl border border-[#EAEAEA] bg-white px-5 py-2.5 text-[13px] font-bold text-[#111111] opacity-50" type="button">
          Gestión manual próximamente
        </button>
      </div>
    </div>
  );
}

/* ─── Branding ─── */

function BrandingView({
  initialData,
  onAction,
  onRefresh,
  branding,
}: {
  initialData: AdminStoreInitialData | null;
  onAction: (a: string) => void;
  onRefresh: () => void;
  branding: StoreBranding;
}) {
  const b = branding;
  const [isPending, startTransition] = useTransition();

  const handleProfileSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        await saveStoreProfileAction(formData);
        onAction("Perfil publico actualizado.");
        onRefresh();
      } catch (error) {
        onAction(error instanceof Error ? error.message : "No se pudo guardar la tienda.");
      }
    });
  };

  return (
    <div className="space-y-8 p-6">
      <form className="space-y-4 rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm" onSubmit={handleProfileSubmit}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Datos publicos de tienda</h3>
            <p className="mt-2 max-w-xl text-[13px] font-medium leading-relaxed text-[#777777]">
              Estos datos alimentan el storefront real y validan slug unico antes de publicar.
            </p>
          </div>
          <button className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#111111] px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" disabled={isPending} type="submit">
            <Save className="h-3.5 w-3.5" />
            {isPending ? "Guardando..." : "Guardar tienda"}
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-bold text-[#111111]">Nombre</span>
            <input className="w-full rounded-xl border border-[#EAEAEA] bg-white px-3 py-2.5 text-sm font-medium text-[#111111] outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" defaultValue={initialData?.store.name ?? b.storeName} name="name" required />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-bold text-[#111111]">Slug publico</span>
            <input className="w-full rounded-xl border border-[#EAEAEA] bg-white px-3 py-2.5 font-mono text-sm font-medium text-[#111111] outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" defaultValue={initialData?.store.slug ?? ""} name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" required />
          </label>
          <label className="space-y-2 lg:col-span-2">
            <span className="text-xs font-bold text-[#111111]">Descripcion</span>
            <textarea className="min-h-24 w-full rounded-xl border border-[#EAEAEA] bg-white px-3 py-2.5 text-sm font-medium text-[#111111] outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" defaultValue={initialData?.store.description ?? ""} maxLength={280} name="description" />
          </label>
          <label className="space-y-2 lg:col-span-2">
            <span className="text-xs font-bold text-[#111111]">Logo URL</span>
            <input className="w-full rounded-xl border border-[#EAEAEA] bg-white px-3 py-2.5 text-sm font-medium text-[#111111] outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" defaultValue={initialData?.store.logo ?? b.logoUrl} name="logo" placeholder="https://..." type="url" />
          </label>
        </div>
      </form>

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
            <div className="mt-3 flex h-20 w-full items-center justify-center rounded-xl border border-[#EAEAEA] bg-white">
              {b.logoUrl ? <img src={b.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain p-2" /> : <span className="text-xs text-gray-400">Sin logo</span>}
            </div>
          </div>
          <div className="rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm">
            <p className="text-xs font-bold text-[#111111]">Favicon</p>
            <div className="mt-3 flex h-20 w-full items-center justify-center rounded-xl border border-[#EAEAEA] bg-white">
              {b.faviconUrl ? <img src={b.faviconUrl} alt="Favicon" className="max-h-full max-w-full object-contain p-2" /> : <span className="text-xs text-gray-400">Sin favicon</span>}
            </div>
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
        <p className="text-[12px] text-gray-500">Configuración gestionada desde Nexora AI Store Builder.</p>
      </div>
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

function PaymentsView({
  initialData,
  isConnected,
  onAction,
  publicPath,
}: {
  initialData: AdminStoreInitialData | null;
  isConnected: boolean;
  onAction: (a: string) => void;
  publicPath: string;
}) {
  const provider = initialData?.paymentProvider ?? null;
  const connectedAt = provider?.connectedAt ? timeFormatter.format(new Date(provider.connectedAt)) : null;

  return (
    <div className="space-y-6 p-6">
      <div className={cn("rounded-2xl border p-5 shadow-sm", isConnected ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50")}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className={cn("text-[11px] font-bold uppercase tracking-[0.18em]", isConnected ? "text-emerald-700" : "text-amber-800")}>
              Mercado Pago por tenant
            </p>
            <h3 className="mt-2 text-xl font-black tracking-tight text-[#111111]">
              {isConnected ? "Cuenta conectada" : "Checkout desactivado"}
            </h3>
            <p className="mt-2 max-w-2xl text-[13px] font-medium leading-relaxed text-[#555555]">
              {isConnected
                ? "Nexora guarda el access token cifrado por tienda. Las ordenes solo pasan a pagadas cuando Mercado Pago confirma el webhook."
                : "La tienda puede publicarse y compartirse, pero el comprador no puede pagar hasta que el dueno conecte su propia cuenta de Mercado Pago."}
            </p>
          </div>
          <Link className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#111111] px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" href="/api/payments/mercadopago/oauth/start">
            <CreditCard className="h-3.5 w-3.5" />
            {isConnected ? "Reconectar" : "Conectar Mercado Pago"}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard label="Estado" value={isConnected ? "Conectado" : "Pendiente"} accent={isConnected} />
        <SummaryCard label="Cuenta MP" value={provider?.externalAccountId ?? "Sin conectar"} />
        <SummaryCard label="Ultima validacion" value={provider?.lastValidatedAt ? timeFormatter.format(new Date(provider.lastValidatedAt)) : "Sin validar"} />
      </div>

      <div className="rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormBlock label="Proveedor" value="Mercado Pago" />
          <FormBlock label="Conectado" value={connectedAt ?? "No conectado"} />
          <FormBlock label="Checkout publico" value={isConnected ? publicPath : "Desactivado hasta conectar MP"} />
          <FormBlock label="Token" value={isConnected ? "Cifrado en DB por tienda" : "No guardado"} />
        </div>
      </div>

      <div className="rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">Regla operativa</p>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-[#666666]">
          No se guarda tarjeta en Nexora. No se marca una orden como pagada desde la vuelta del checkout. El estado pagado depende del webhook firmado y del pago consultado con el token de esta tienda.
        </p>
        <button className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#EAEAEA] bg-white px-4 py-2.5 text-[13px] font-bold text-[#111111] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30" onClick={() => onAction("El checkout sigue bloqueado sin una cuenta MP conectada.")} type="button">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          Verificar regla
        </button>
      </div>
    </div>
  );
}

function PreviewView({ onAction }: { onAction: (a: string) => void }) {
  const p = { status: "draft", publishedAt: new Date().toISOString() };

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
        <button disabled className="flex items-center gap-2 rounded-xl border border-[#EAEAEA] bg-white px-5 py-2.5 text-[13px] font-bold text-[#111111] opacity-50" type="button">
          Previsualizar en Vivo Mpróximamente
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
    </div>
  );
}

function TableHead({ label }: { label: string }) {
  return <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">{label}</th>;
}

function NoResultsState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-gray-100 bg-gray-50 shadow-sm">
        <Search className="h-8 w-8 text-gray-300" />
      </div>
      <h3 className="text-xl font-extrabold text-[#111111]">No encontramos resultados</h3>
      <p className="mt-2 max-w-md text-[15px] font-medium text-[#888888]">Ajusta la búsqueda y vuelve a intentarlo.</p>
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
