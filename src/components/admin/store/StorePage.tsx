"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  CreditCard,
  Eye,
  EyeOff,
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
  Pencil,
  Save,
  Search,
  Share2,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";

import { StoreDrawer } from "@/components/admin/store/StoreDrawer";
import { SectionEditorDrawer } from "@/components/admin/store/SectionEditorDrawer";
import type { SectionBlock } from "@/components/admin/store/SectionEditorDrawer";
import { StoreStatusBadge, SectionTypeBadge, PageTypeBadge, ColorDot } from "@/components/admin/store/StoreBadge";
import { DomainSettingsView } from "@/components/admin/store/tabs/DomainSettingsView";
import { TableSkeleton } from "@/components/admin/orders/TableSkeleton";
import { cn } from "@/lib/utils";

import {
  createFirstStoreProductAction,
  publishStoreAction,
  saveStoreProfileAction,
  saveStoreBranding,
  saveHomeBlocks,
} from "@/lib/store-engine/actions";
import type { AdminStoreInitialData, BlockType } from "@/types/store-engine";
import type { StoreTheme, StoreBranding, StoreSummary, HomeSection, NavItem, StorePage as StorePageType, StoreDomain, StoreStatus } from "@/types/store";
import type { MercadoPagoPlatformReadiness } from "@/lib/payments/mercadopago/platform-readiness";

type TabValue = "resumen" | "tema" | "branding" | "home" | "navegacion" | "paginas" | "dominio" | "pagos" | "preview";

type DrawerContent =
  | { kind: "theme"; data: StoreTheme }
  | { kind: "section"; data: HomeSection }
  | { kind: "nav"; data: NavItem }
  | { kind: "page"; data: StorePageType }
  | { kind: "domain"; data: StoreDomain };

interface ToastMessage { id: string; title: string; description: string; }

const timeFormatter = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

// ─── Mercado Pago error reason → user-facing copy ────────────────────────
// Maps the stable error vocabulary emitted by the OAuth callback
// (see `classifyMpOAuthError` in lib/payments/mercadopago/oauth.ts) into
// actionable toast messages. Anything we don't recognize falls back to
// a generic copy that still points the user at the Developer Dashboard.
function mpReasonCopy(reason: string): { title: string; description: string } {
  switch (reason) {
    case "invalid_grant":
      return {
        title: "Código de autorización inválido",
        description:
          "El código de Mercado Pago ya fue usado o expiró. Volvé a iniciar la conexión desde cero (los códigos duran sólo unos minutos).",
      };
    case "invalid_client":
      return {
        title: "Credenciales de la app rechazadas",
        description:
          "Mercado Pago rechazó el Client ID o Secret de la app. Verificá que los valores cargados en la infraestructura correspondan a las credenciales de PRODUCCIÓN de la aplicación.",
      };
    case "invalid_redirect_uri":
      return {
        title: "Redirect URI no autorizada",
        description:
          "La URL de retorno no coincide con ninguna dada de alta en el Developer Dashboard de Mercado Pago. Agregá el redirect URI exacto que figura en la configuración global y volvé a intentarlo.",
      };
    case "same_account":
      return {
        title: "Cuenta MP dueña de la app",
        description:
          "Mercado Pago no permite vincular la misma cuenta que creó la aplicación. Conectate con otra cuenta MP (podés crear una cuenta de prueba desde el Developer Panel).",
      };
    case "no_access_token":
      return {
        title: "Respuesta incompleta de Mercado Pago",
        description:
          "MP devolvió una respuesta OK pero sin access_token. Reintentá la conexión; si persiste, revisá el estado de la aplicación en el Developer Dashboard.",
      };
    case "network":
      return {
        title: "No se pudo contactar a Mercado Pago",
        description:
          "La request al endpoint de Mercado Pago falló antes de llegar. Revisá la conectividad del deployment y reintentá.",
      };
    default:
      return {
        title: "No se pudo conectar",
        description:
          "Mercado Pago rechazó el intercambio de código. Revisá el estado de la app en el Developer Dashboard (OAuth habilitado, Redirect URI dada de alta, credenciales de producción activas).",
      };
  }
}

export function StorePage({
  initialData,
  mercadoPagoPlatformReadiness,
  isOps,
}: {
  initialData?: AdminStoreInitialData | null;
  mercadoPagoPlatformReadiness: MercadoPagoPlatformReadiness;
  isOps: boolean;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const initialTab: TabValue = tabParam === "tema" || tabParam === "branding" || tabParam === "home" || tabParam === "navegacion" || tabParam === "paginas" || tabParam === "dominio" || tabParam === "pagos" || tabParam === "preview" ? tabParam : "resumen";
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [drawerContent, setDrawerContent] = useState<DrawerContent | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [sectionEditorBlock, setSectionEditorBlock] = useState<SectionBlock | null>(null);

  // ─── Section blocks for editor (preserves full settings for save) ───
  const sectionBlocks: SectionBlock[] = initialData ? initialData.homeBlocks.map(b => ({
    id: b.id,
    blockType: b.blockType,
    sortOrder: b.sortOrder,
    isVisible: b.isVisible,
    settings: b.settings,
    source: b.source,
    state: b.state,
  })) : [];

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
      // Force a server re-fetch so paymentProvider status flips from
      // "disconnected" to "connected" in the rendered UI immediately.
      // revalidatePath on the server + this refresh are belt-and-suspenders:
      // if the RSC payload was already cached client-side, refresh() makes
      // it re-request a fresh render.
      router.refresh();
    } else if (mp === "platform_not_ready" || mp === "missing_config") {
      // `missing_config` is kept for backward compatibility with old links.
      // Intentionally generic for merchants: we don't leak env names here.
      pushToast(
        "Mercado Pago no está listo",
        isOps
          ? "La integración está incompleta a nivel plataforma. Abrí la configuración global para ver qué falta."
          : "La plataforma todavía no habilitó Mercado Pago. Contactá al equipo operativo para configurarlo.",
      );
    } else if (mp === "invalid_state") {
      pushToast("Conexión rechazada", "La respuesta OAuth no pertenece a esta sesión. Volvé a iniciar la conexión.");
    } else if (mp && mp.startsWith("error_")) {
      // Specific diagnostics from the structured MP exchange error. These
      // are fail-honest messages: they point at the real cause instead of
      // the old generic "no devolvió credenciales válidas".
      const reason = mp.slice("error_".length);
      const { title, description } = mpReasonCopy(reason);
      pushToast(title, description);
    } else if (mp === "error") {
      pushToast("No se pudo conectar", "Mercado Pago no devolvió credenciales válidas. Revisá la configuración de la app en el Developer Dashboard.");
    }

    // Strip the `mp` param from the URL so a manual refresh doesn't keep
    // re-triggering the toast and router.refresh() loop. We preserve the
    // active tab so the user stays on "pagos" after the cleanup.
    const url = new URL(window.location.href);
    url.searchParams.delete("mp");
    window.history.replaceState(null, "", url.toString());
    // Intentionally depend only on the presence of `mp`: when it's stripped
    // this effect re-runs with `mp === null` and exits via the early return.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <h1 className="text-[28px] lg:text-[32px] font-semibold leading-[1.08] tracking-[-0.035em] text-ink-0">Mi tienda.</h1>
          <p className="mt-2 text-[14px] leading-[1.55] text-ink-5">Apariencia, contenido y configuración de tu tienda online.</p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)]">
        <div aria-label="Secciones de tienda" className="flex items-center gap-8 overflow-x-auto border-b border-[color:var(--hairline)] bg-[var(--surface-1)] px-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" role="tablist">
          {tabs.map((tab) => (
            <button key={tab.value} aria-selected={activeTab === tab.value} className={cn("group relative whitespace-nowrap py-4 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]", activeTab === tab.value ? "text-ink-0" : "text-ink-5 hover:text-ink-0")} onClick={() => handleTabChange(tab.value)} role="tab" type="button">
              <span className="flex items-center gap-2">{tab.icon}{tab.label}</span>
              {activeTab === tab.value ? <div className="absolute inset-x-0 bottom-0 h-[2px] bg-ink-0" /> : null}
            </button>
          ))}
        </div>

        {showToolbar ? (
          <div className="flex flex-col gap-4 border-b border-[color:var(--hairline)] bg-[var(--surface-0)] p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center">
              <div className="group relative w-full lg:max-w-sm">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-6 transition-colors group-focus-within:text-ink-0" strokeWidth={1.75} />
                <input aria-label="Buscar en la vista" className="w-full h-10 pl-10 pr-4 text-[13px] font-medium bg-[var(--surface-1)] border border-[color:var(--hairline)] rounded-[var(--r-sm)] outline-none transition-[box-shadow,border-color] focus:bg-[var(--surface-0)] focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)] text-ink-0 placeholder:text-ink-6" onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar..." type="text" value={searchQuery} />
              </div>
            </div>
          </div>
        ) : null}

        <div className="min-h-[420px] bg-[var(--surface-0)]" role="tabpanel">
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
            <ThemeView initialData={initialData ?? null} onAction={handleAction} onNavigate={handleTabChange} />
          ) : activeTab === "branding" ? (
            <BrandingView initialData={initialData ?? null} onAction={handleAction} onRefresh={refreshData} branding={brandingData} pushToast={pushToast} />
          ) : activeTab === "home" ? (
            <HomeView
              sectionBlocks={sectionBlocks}
              onAction={handleAction}
              onRefresh={refreshData}
              onEditSection={(block) => setSectionEditorBlock(block)}
            />
          ) : activeTab === "navegacion" ? (
            <NavView searchQuery={searchQuery} openDrawer={openDrawer} onAction={handleAction} items={navItems} />
          ) : activeTab === "paginas" ? (
            <PagesView searchQuery={searchQuery} openDrawer={openDrawer} onAction={handleAction} pages={storePages} />
          ) : activeTab === "dominio" ? (
            <DomainSettingsView initialData={initialData!} onAction={handleAction} storeId={initialData?.store.id} />
          ) : activeTab === "pagos" ? (
            <PaymentsView
              initialData={initialData ?? null}
              isConnected={isMercadoPagoConnected}
              onAction={handleAction}
              publicPath={publicPath}
              platformReadiness={mercadoPagoPlatformReadiness}
              isOps={isOps}
            />
          ) : (
            <PreviewView onAction={handleAction} />
          )}
        </div>
      </div>

      <StoreDrawer content={drawerContent} isOpen={drawerContent !== null} onClose={closeDrawer} onAction={handleAction} />
      <SectionEditorDrawer
        block={sectionEditorBlock}
        allBlocks={sectionBlocks}
        isOpen={sectionEditorBlock !== null}
        onClose={() => setSectionEditorBlock(null)}
        onSaved={() => {
          pushToast("Sección actualizada", "Los cambios se reflejan en el storefront.");
          setSectionEditorBlock(null);
          refreshData();
        }}
      />
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
        <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Logo</p>
          <div className="mt-3 flex h-12 w-12 items-center justify-center rounded-[var(--r-sm)] bg-[var(--surface-1)] border border-[color:var(--hairline)] text-ink-6">
            {s.hasLogo ? <Check className="h-5 w-5 text-[color:var(--signal-success)]" strokeWidth={1.75} /> : <X className="h-5 w-5" strokeWidth={1.75} />}
          </div>
        </div>
        <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Colores</p>
          <div className="mt-3 flex gap-2"><ColorDot color={s.primaryColor} /><ColorDot color={s.secondaryColor} /></div>
        </div>
        <SummaryCard label="Páginas" value={s.pagesCount.toString()} />
        <SummaryCard label="Secciones home" value={s.homeSectionsCount.toString()} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5 lg:col-span-2">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">URL pública</p>
              <p className="mt-2 break-all font-mono text-[13px] font-semibold text-ink-0">{publicPath}</p>
              <p className="mt-2 text-[12px] leading-[1.55] text-ink-5">
                {isLive
                  ? isMercadoPagoConnected
                    ? "La tienda está publicada y el checkout está habilitado con la cuenta MP conectada."
                    : "La tienda está publicada. El checkout queda desactivado hasta conectar Mercado Pago."
                  : "La URL queda activa cuando publiques una tienda con productos disponibles."}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {isLive ? (
                <Link className="inline-flex items-center gap-2 h-10 px-4 rounded-[var(--r-sm)] bg-ink-0 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]" href={publicPath} target="_blank">
                  <Eye className="h-3.5 w-3.5" />
                  Ver mi tienda
                </Link>
              ) : (
                <button className="inline-flex cursor-not-allowed items-center gap-2 h-10 px-4 rounded-[var(--r-sm)] bg-ink-0 text-[13px] font-medium text-ink-12 opacity-40" disabled type="button">
                  <Eye className="h-3.5 w-3.5" />
                  Ver mi tienda
                </button>
              )}
              <button className="inline-flex items-center gap-2 h-10 px-4 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] text-[13px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]" disabled={!isLive} onClick={handleShare} type="button">
                <Share2 className="h-3.5 w-3.5" />
                Compartir tienda
              </button>
            </div>
          </div>
        </div>
        <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Checkout</p>
          <p className={cn("mt-2 text-[13px] font-semibold", isMercadoPagoConnected ? "text-[color:var(--signal-success)]" : "text-[color:var(--signal-warning)]")}>
            {isMercadoPagoConnected ? "Mercado Pago conectado" : "Mercado Pago pendiente"}
          </p>
          <p className="mt-2 text-[12px] leading-[1.55] text-ink-5">
            {isMercadoPagoConnected ? "Las compras redirigen a la cuenta propia del dueño de la tienda." : "La tienda se puede preparar y publicar, pero no cobra hasta conectar una cuenta real."}
          </p>
          <button className="mt-4 text-[12px] font-medium text-ink-0 underline underline-offset-4" onClick={() => onNavigate("pagos")} type="button">
            Revisar pagos
          </button>
        </div>
      </div>

      {productCount === 0 ? (
        <FirstProductPanel onAction={onAction} onRefresh={onRefresh} />
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NavCard icon={<Palette className="h-5 w-5 text-ink-4" strokeWidth={1.75} />} title="Tema" description={s.themeName} onClick={() => onNavigate("tema")} />
        <NavCard icon={<Paintbrush className="h-5 w-5 text-ink-4" strokeWidth={1.75} />} title="Branding" description="Logo, colores, fuentes" onClick={() => onNavigate("branding")} />
        <NavCard icon={<Home className="h-5 w-5 text-ink-4" strokeWidth={1.75} />} title="Home" description={`${s.homeSectionsCount} secciones`} onClick={() => onNavigate("home")} />
        <NavCard icon={<Globe className="h-5 w-5 text-ink-4" strokeWidth={1.75} />} title="Dominio" description={s.domain} onClick={() => onNavigate("dominio")} />
      </div>

      <div className="flex items-center gap-3">
        <button className="inline-flex items-center gap-2 h-10 px-5 rounded-[var(--r-sm)] bg-ink-0 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]" disabled={isPublishing || sellableProducts === 0} onClick={handlePublish} type="button">
          <Eye className="h-3.5 w-3.5" />
          {isPublishing ? "Publicando..." : "Publicar tienda"}
        </button>
        <button className="inline-flex items-center gap-2 h-10 px-5 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] text-[13px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]" onClick={() => onNavigate("preview")} type="button">
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

  const inputCls = "h-11 px-3.5 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] text-[13px] font-medium text-ink-0 outline-none transition-[box-shadow,border-color] focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)] placeholder:text-ink-6";

  return (
    <form className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Primer producto</p>
          <h3 className="mt-2 text-[16px] font-semibold tracking-[-0.01em] text-ink-0">Cargá un SKU vendible</h3>
          <p className="mt-1 max-w-xl text-[13px] leading-[1.55] text-ink-5">
            Crea un producto real en la DB con una variante, precio y stock. Después podés editarlo desde Catálogo e Inventario.
          </p>
        </div>
        <button className="inline-flex shrink-0 items-center gap-2 h-10 px-5 rounded-[var(--r-sm)] bg-ink-0 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]" disabled={isPending} type="submit">
          <Save className="h-3.5 w-3.5" />
          {isPending ? "Creando..." : "Crear producto"}
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <input className={inputCls} name="title" placeholder="Nombre del producto" required />
        <input className={inputCls} name="variantTitle" placeholder="Variante, ej. Default" />
        <input className={inputCls} min="1" name="price" placeholder="Precio" required step="0.01" type="number" />
        <input className={inputCls} min="0" name="stock" placeholder="Stock" required step="1" type="number" />
        <input className={cn(inputCls, "md:col-span-2")} name="category" placeholder="Categoría" />
        <input className={cn(inputCls, "md:col-span-2")} name="featuredImage" placeholder="URL de imagen pública" type="url" />
        <textarea className={cn(inputCls, "min-h-24 md:col-span-2 xl:col-span-4")} name="description" placeholder="Descripción breve" />
      </div>
    </form>
  );
}

/* ─── Theme ─── */

function ThemeView({ initialData, onAction, onNavigate }: { initialData: AdminStoreInitialData | null; onAction: (a: string) => void; onNavigate: (t: TabValue) => void }) {
  const theme = initialData?.theme;
  const themeName = theme?.activeTheme === "bold" ? "Bold Commerce" : theme?.activeTheme === "classic" ? "Classic Elegance" : "Minimal Pro";
  const variant = theme?.themeVariant === "dark" ? "Oscuro" : "Claro";
  const published = theme?.isPublished ? "Publicado" : "Borrador";

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Tema activo</h3>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Tema" value={themeName} accent />
        <SummaryCard label="Variante" value={variant} />
        <SummaryCard label="Estado" value={published} />
      </div>
      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Personalización</p>
        <p className="mt-2 max-w-xl text-[13px] leading-[1.55] text-ink-5">
          La identidad visual de tu tienda se controla desde Branding (colores, tipografía, estilo de botones) y desde las secciones del Home (contenido de cada bloque).
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="inline-flex items-center gap-2 h-10 px-5 rounded-[var(--r-sm)] bg-ink-0 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]" onClick={() => onNavigate("branding")} type="button">
            <Paintbrush className="h-3.5 w-3.5" />
            Editar branding
          </button>
          <button className="inline-flex items-center gap-2 h-10 px-5 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] text-[13px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]" onClick={() => onNavigate("home")} type="button">
            <Home className="h-3.5 w-3.5" />
            Editar secciones
          </button>
        </div>
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
  pushToast,
}: {
  initialData: AdminStoreInitialData | null;
  onAction: (a: string) => void;
  onRefresh: () => void;
  branding: StoreBranding;
  pushToast: (title: string, description: string) => void;
}) {
  const b = branding;
  const [isPending, startTransition] = useTransition();
  const [isBrandingSaving, startBrandingSave] = useTransition();
  const [primaryColor, setPrimaryColor] = useState(b.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(b.secondaryColor);
  const [fontFamily, setFontFamily] = useState(b.fontFamily);
  const [buttonStyle, setButtonStyle] = useState(b.buttonStyle);

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

  const handleBrandingSave = () => {
    startBrandingSave(async () => {
      try {
        await saveStoreBranding({
          primaryColor,
          secondaryColor,
          fontFamily,
          buttonStyle: buttonStyle === "rounded" ? "rounded-sm" : buttonStyle,
        });
        pushToast("Branding actualizado", "Los cambios se reflejan en el storefront.");
        onRefresh();
      } catch (error) {
        onAction(error instanceof Error ? error.message : "No se pudo guardar branding.");
      }
    });
  };

  const inputCls = "w-full h-11 px-3.5 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] text-[13px] font-medium text-ink-0 outline-none transition-[box-shadow,border-color] focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)]";
  const labelCls = "text-[12px] font-medium text-ink-5";
  const sectionTitle = "text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5";
  const fontOptions = ["Inter", "Roboto", "Outfit", "Poppins", "Manrope", "DM Sans", "Source Sans 3"];
  const buttonOptions: Array<{ value: string; label: string }> = [
    { value: "rounded", label: "Redondeado" },
    { value: "square", label: "Cuadrado" },
    { value: "pill", label: "Píldora" },
  ];

  return (
    <div className="space-y-8 p-6">
      <form className="space-y-4 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5" onSubmit={handleProfileSubmit}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className={sectionTitle}>Datos públicos de tienda</h3>
            <p className="mt-2 max-w-xl text-[13px] leading-[1.55] text-ink-5">
              Estos datos alimentan el storefront real y validan slug único antes de publicar.
            </p>
          </div>
          <button className="inline-flex shrink-0 items-center gap-2 h-10 px-5 rounded-[var(--r-sm)] bg-ink-0 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]" disabled={isPending} type="submit">
            <Save className="h-3.5 w-3.5" />
            {isPending ? "Guardando..." : "Guardar tienda"}
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <label className="space-y-1.5">
            <span className={labelCls}>Nombre</span>
            <input className={inputCls} defaultValue={initialData?.store.name ?? b.storeName} name="name" required />
          </label>
          <label className="space-y-1.5">
            <span className={labelCls}>Slug público</span>
            <input className={cn(inputCls, "font-mono")} defaultValue={initialData?.store.slug ?? ""} name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" required />
          </label>
          <label className="space-y-1.5 lg:col-span-2">
            <span className={labelCls}>Descripción</span>
            <textarea className={cn(inputCls, "min-h-24 py-2.5")} defaultValue={initialData?.store.description ?? ""} maxLength={280} name="description" />
          </label>
          <label className="space-y-1.5 lg:col-span-2">
            <span className={labelCls}>Logo URL</span>
            <input className={inputCls} defaultValue={initialData?.store.logo ?? b.logoUrl} name="logo" placeholder="https://..." type="url" />
          </label>
        </div>
      </form>

      {/* ─── Editable branding section ─── */}
      <div className="space-y-4 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className={sectionTitle}>Identidad visual</h3>
            <p className="mt-2 max-w-xl text-[13px] leading-[1.55] text-ink-5">
              Colores, tipografía y estilo de botones. Se aplican en todo el storefront.
            </p>
          </div>
          <button className="inline-flex shrink-0 items-center gap-2 h-10 px-5 rounded-[var(--r-sm)] bg-ink-0 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]" disabled={isBrandingSaving} onClick={handleBrandingSave} type="button">
            <Save className="h-3.5 w-3.5" />
            {isBrandingSaving ? "Guardando..." : "Guardar branding"}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className={labelCls}>Color principal</span>
            <div className="flex items-center gap-3">
              <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-11 w-14 cursor-pointer rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-1" />
              <input className={inputCls} value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} placeholder="#000000" maxLength={7} />
            </div>
          </label>
          <label className="space-y-1.5">
            <span className={labelCls}>Color secundario</span>
            <div className="flex items-center gap-3">
              <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="h-11 w-14 cursor-pointer rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-1" />
              <input className={inputCls} value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} placeholder="#10B981" maxLength={7} />
            </div>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className={labelCls}>Tipografía</span>
            <select className={cn(inputCls, "appearance-none")} value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}>
              {fontOptions.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
          <div className="space-y-1.5">
            <span className={labelCls}>Estilo de botones</span>
            <div className="flex gap-2">
              {buttonOptions.map((opt) => (
                <button key={opt.value} type="button" onClick={() => setButtonStyle(opt.value as any)} className={cn("flex-1 h-11 rounded-[var(--r-sm)] border text-[12px] font-medium transition-colors", buttonStyle === opt.value ? "border-ink-0 bg-ink-0 text-ink-12" : "border-[color:var(--hairline)] bg-[var(--surface-1)] text-ink-5 hover:bg-[var(--surface-2)]")}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className={sectionTitle}>Imágenes</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5">
            <p className="text-[12px] font-medium text-ink-0">Logo</p>
            <div className="mt-3 flex h-20 w-full items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
              {b.logoUrl ? <img src={b.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain p-2" /> : <span className="text-[12px] text-ink-6">Sin logo</span>}
            </div>
          </div>
          <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5">
            <p className="text-[12px] font-medium text-ink-0">Favicon</p>
            <div className="mt-3 flex h-20 w-full items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
              {b.faviconUrl ? <img src={b.faviconUrl} alt="Favicon" className="max-h-full max-w-full object-contain p-2" /> : <span className="text-[12px] text-ink-6">Sin favicon</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Home ─── */

function HomeView({ sectionBlocks, onAction, onRefresh, onEditSection }: { sectionBlocks: SectionBlock[]; onAction: (a: string) => void; onRefresh: () => void; onEditSection: (block: SectionBlock) => void }) {
  const [isReordering, startReorder] = useTransition();

  const sorted = [...sectionBlocks].sort((a, b) => a.sortOrder - b.sortOrder);
  const visibleCount = sorted.filter((s) => s.isVisible).length;

  const handleToggle = (block: SectionBlock) => {
    startReorder(async () => {
      try {
        const updated = sectionBlocks.map((b) => ({
          blockType: b.blockType as BlockType,
          sortOrder: b.sortOrder,
          isVisible: b.id === block.id ? !b.isVisible : b.isVisible,
          settingsJson: JSON.stringify(b.settings),
          source: b.source,
          state: "published",
        }));
        await saveHomeBlocks(updated);
        onAction(block.isVisible ? "Sección ocultada." : "Sección activada.");
        onRefresh();
      } catch { /* handled */ }
    });
  };

  const handleMove = (block: SectionBlock, direction: "up" | "down") => {
    const idx = sorted.findIndex((s) => s.id === block.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    startReorder(async () => {
      try {
        const reordered = sorted.map((s, i) => {
          let newOrder = s.sortOrder;
          if (i === idx) newOrder = sorted[swapIdx].sortOrder;
          if (i === swapIdx) newOrder = sorted[idx].sortOrder;
          return {
            blockType: s.blockType as BlockType,
            sortOrder: newOrder,
            isVisible: s.isVisible,
            settingsJson: JSON.stringify(s.settings),
            source: s.source,
            state: "published",
          };
        });
        await saveHomeBlocks(reordered);
        onAction("Orden actualizado.");
        onRefresh();
      } catch { /* handled */ }
    });
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Secciones del home</h3>
          <p className="mt-1 text-[12px] text-ink-5">{visibleCount} de {sorted.length} visibles en el storefront</p>
        </div>
        <span className={cn("inline-flex items-center rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5", isReordering && "opacity-50")}>{sorted.length} secciones</span>
      </div>
      <div className="space-y-2">
        {sorted.map((block, idx) => (
          <div key={block.id} className={cn("group flex w-full items-center gap-3 rounded-[var(--r-md)] border p-4 transition-colors", block.isVisible ? "border-[color:var(--hairline)] bg-[var(--surface-0)]" : "border-dashed border-[color:var(--hairline)] bg-[var(--surface-1)] opacity-60")}>
            {/* Reorder */}
            <div className="flex shrink-0 flex-col gap-0.5">
              <button type="button" disabled={idx === 0 || isReordering} onClick={() => handleMove(block, "up")} className="rounded p-0.5 text-ink-6 transition-colors hover:text-ink-0 disabled:opacity-30" aria-label="Mover arriba">
                <ArrowUp className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
              <button type="button" disabled={idx === sorted.length - 1 || isReordering} onClick={() => handleMove(block, "down")} className="rounded p-0.5 text-ink-6 transition-colors hover:text-ink-0 disabled:opacity-30" aria-label="Mover abajo">
                <ArrowDown className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            </div>
            {/* Info */}
            <div className="flex flex-1 items-center justify-between gap-3 min-w-0">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-ink-0">{blockLabel(block.blockType)}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.1em] text-ink-5">
                    {block.source === "ai" ? <><Sparkles className="h-2.5 w-2.5" />IA</> : "Manual"}
                  </span>
                  <span className={cn("inline-flex items-center rounded-[var(--r-xs)] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.1em]", block.isVisible ? "bg-[color:var(--signal-success)]/10 text-[color:var(--signal-success)]" : "bg-[var(--surface-2)] text-ink-5")}>
                    {block.isVisible ? "Visible" : "Oculta"}
                  </span>
                </div>
              </div>
              {/* Actions */}
              <div className="flex shrink-0 items-center gap-1.5">
                <button type="button" onClick={() => handleToggle(block)} disabled={isReordering} className="rounded-[var(--r-sm)] p-2 text-ink-5 transition-colors hover:bg-[var(--surface-2)] hover:text-ink-0" title={block.isVisible ? "Ocultar sección" : "Mostrar sección"}>
                  {block.isVisible ? <Eye className="h-4 w-4" strokeWidth={1.75} /> : <EyeOff className="h-4 w-4" strokeWidth={1.75} />}
                </button>
                <button type="button" onClick={() => onEditSection(block)} className="inline-flex items-center gap-1.5 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-3 py-2 text-[12px] font-medium text-ink-3 transition-colors hover:bg-[var(--surface-2)] hover:text-ink-0">
                  <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Editar
                </button>
              </div>
            </div>
          </div>
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
          <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">{group.label}</h3>
          {group.items.map((item) => (
            <button key={item.id} className="group flex w-full items-center gap-4 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-4 text-left transition-colors hover:bg-[var(--surface-1)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]" onClick={() => openDrawer({ kind: "nav", data: item })} type="button">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--r-sm)] bg-[var(--surface-1)] border border-[color:var(--hairline)] text-ink-5 transition-colors group-hover:text-ink-0">
                <Link2 className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <div className="flex flex-1 items-center justify-between gap-3 min-w-0">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-ink-0">{item.label}</p>
                  <p className="mt-0.5 truncate text-[11px] font-mono font-medium text-ink-5">{item.destination}</p>
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
            <tr className="border-b border-[color:var(--hairline)] bg-[var(--surface-1)]">
              <TableHead label="Nombre" />
              <TableHead label="Slug" />
              <TableHead label="Tipo" />
              <TableHead label="Modificada" />
              <TableHead label="Estado" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--hairline)]">
            {filtered.map((p) => (
              <tr key={p.id} className="group cursor-pointer bg-[var(--surface-0)] transition-colors hover:bg-[var(--surface-1)] focus-within:bg-[var(--surface-2)]" onClick={() => openDrawer({ kind: "page", data: p })} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrawer({ kind: "page", data: p }); } }}>
                <td className="px-6 py-4 text-[13px] font-medium text-ink-0">{p.name}</td>
                <td className="px-6 py-4 text-[11px] font-mono font-medium text-ink-5">{p.slug}</td>
                <td className="px-6 py-4"><PageTypeBadge type={p.type} /></td>
                <td className="px-6 py-4 text-[11px] font-medium tabular-nums text-ink-5">{timeFormatter.format(new Date(p.lastModified))}</td>
                <td className="px-6 py-4"><StoreStatusBadge status={p.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-[color:var(--hairline)] bg-[var(--surface-1)] px-6 py-3">
        <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Mostrando <b className="text-ink-0 px-1 font-semibold">{filtered.length}</b> de {pages.length}</span>
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
  platformReadiness,
  isOps,
}: {
  initialData: AdminStoreInitialData | null;
  isConnected: boolean;
  onAction: (a: string) => void;
  publicPath: string;
  platformReadiness: MercadoPagoPlatformReadiness;
  isOps: boolean;
}) {
  const provider = initialData?.paymentProvider ?? null;
  const connectedAt = provider?.connectedAt ? timeFormatter.format(new Date(provider.connectedAt)) : null;
  const platformReady = platformReadiness.ready;
  const needsReconnection = provider?.status === "needs_reconnection";

  // ─── Header status: 4 explicit states, never a dead CTA ───────────────
  // 1. Platform not ready  → no connect CTA for merchants; ops gets a
  //    link to the platform readiness screen.
  // 2. Platform ready, tenant disconnected → real OAuth CTA.
  // 3. Connected           → "Reconectar" CTA.
  // 4. Needs reconnection  → same CTA, different label + warning copy.
  let headerAccent: "success" | "warning" | "danger";
  let headerEyebrow: string;
  let headerTitle: string;
  let headerBody: string;
  let ctaHref: string | null = null;
  let ctaLabel = "";
  let ctaSecondary: { href: string; label: string } | null = null;

  if (!platformReady) {
    headerAccent = "warning";
    headerEyebrow = "Mercado Pago · Plataforma";
    headerTitle = "Mercado Pago no está listo a nivel plataforma";
    headerBody = isOps
      ? "La integración OAuth de Mercado Pago no tiene toda la configuración global cargada. Abrí la pantalla de configuración global para ver qué variable falta y cargarla en la infraestructura."
      : "La plataforma todavía no habilitó la integración con Mercado Pago. Hasta que el equipo operativo de Nexora complete la configuración global, ninguna tienda puede conectar su cuenta. Contactá soporte si necesitás acelerarlo.";
    if (isOps) {
      ctaHref = "/admin/settings/integrations/mercadopago";
      ctaLabel = "Configurar Mercado Pago";
    }
  } else if (needsReconnection) {
    headerAccent = "danger";
    headerEyebrow = "Mercado Pago por tenant";
    headerTitle = "Reconexión necesaria";
    headerBody =
      "La sesión de Mercado Pago de esta tienda expiró o fue revocada. Reconectá la cuenta para volver a habilitar el checkout. Los pedidos existentes no se ven afectados.";
    ctaHref = "/api/payments/mercadopago/oauth/start";
    ctaLabel = "Reconectar Mercado Pago";
  } else if (isConnected) {
    headerAccent = "success";
    headerEyebrow = "Mercado Pago por tenant";
    headerTitle = "Cuenta conectada";
    headerBody =
      "Nexora guarda el access token cifrado por tienda. Las órdenes sólo pasan a pagadas cuando Mercado Pago confirma el webhook.";
    ctaHref = "/api/payments/mercadopago/oauth/start";
    ctaLabel = "Reconectar";
  } else {
    headerAccent = "warning";
    headerEyebrow = "Mercado Pago por tenant";
    headerTitle = "Checkout desactivado";
    headerBody =
      "La tienda puede publicarse y compartirse, pero el comprador no puede pagar hasta que el dueño conecte su propia cuenta de Mercado Pago.";
    ctaHref = "/api/payments/mercadopago/oauth/start";
    ctaLabel = "Conectar Mercado Pago";
  }

  if (isOps && platformReady) {
    ctaSecondary = {
      href: "/admin/settings/integrations/mercadopago",
      label: "Ver configuración global",
    };
  }

  const accentClass =
    headerAccent === "success"
      ? "text-[color:var(--signal-success)]"
      : headerAccent === "danger"
        ? "text-[color:var(--signal-danger)]"
        : "text-[color:var(--signal-warning)]";

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className={cn("text-[10px] font-medium uppercase tracking-[0.14em]", accentClass)}>
              {headerEyebrow}
            </p>
            <h3 className="mt-2 text-[18px] font-semibold tracking-[-0.02em] text-ink-0">{headerTitle}</h3>
            <p className="mt-2 max-w-2xl text-[13px] leading-[1.55] text-ink-5">{headerBody}</p>
            {!platformReady && !isOps ? (
              <p className="mt-3 max-w-2xl text-[12px] leading-[1.55] text-ink-6">
                Esta pantalla se actualizará automáticamente cuando la configuración global esté lista.
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            {ctaHref ? (
              <Link
                className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-[var(--r-sm)] bg-ink-0 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
                href={ctaHref}
              >
                <CreditCard className="h-3.5 w-3.5" />
                {ctaLabel}
              </Link>
            ) : (
              <span className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] text-[12px] font-medium text-ink-5">
                <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.75} />
                Sin acciones disponibles
              </span>
            )}
            {ctaSecondary ? (
              <Link
                href={ctaSecondary.href}
                className="text-[12px] font-medium text-ink-0 underline underline-offset-4"
              >
                {ctaSecondary.label}
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard label="Estado" value={isConnected ? "Conectado" : "Pendiente"} accent={isConnected} />
        <SummaryCard label="Cuenta MP" value={provider?.externalAccountId ?? "Sin conectar"} />
        <SummaryCard label="Última validación" value={provider?.lastValidatedAt ? timeFormatter.format(new Date(provider.lastValidatedAt)) : "Sin validar"} />
      </div>

      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormBlock label="Proveedor" value="Mercado Pago" />
          <FormBlock label="Conectado" value={connectedAt ?? "No conectado"} />
          <FormBlock label="Checkout público" value={isConnected ? publicPath : "Desactivado hasta conectar MP"} />
          <FormBlock label="Token" value={isConnected ? "Cifrado en DB por tienda" : "No guardado"} />
        </div>
      </div>

      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Regla operativa</p>
        <p className="mt-2 max-w-2xl text-[13px] leading-[1.55] text-ink-5">
          No se guarda tarjeta en Nexora. No se marca una orden como pagada desde la vuelta del checkout. El estado pagado depende del webhook firmado y del pago consultado con el token de esta tienda.
        </p>
        <button className="mt-4 inline-flex items-center gap-2 h-10 px-4 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] text-[13px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]" onClick={() => onAction("El checkout sigue bloqueado sin una cuenta MP conectada.")} type="button">
          <AlertTriangle className="h-3.5 w-3.5 text-[color:var(--signal-warning)]" strokeWidth={1.75} />
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
        <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[color:var(--hairline)] bg-[var(--surface-1)] px-5 py-3">
            <Monitor className="h-4 w-4 text-ink-5" strokeWidth={1.75} />
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Desktop</span>
          </div>
          <div className="flex h-48 items-center justify-center bg-[var(--surface-1)]">
            <div className="space-y-2 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[var(--r-sm)] bg-[var(--surface-0)] border border-[color:var(--hairline)]"><Monitor className="h-5 w-5 text-ink-5" strokeWidth={1.75} /></div>
              <p className="text-[12px] font-medium text-ink-5">Vista desktop</p>
              <p className="text-[11px] font-medium text-ink-6">1440 × 900</p>
            </div>
          </div>
        </div>

        <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[color:var(--hairline)] bg-[var(--surface-1)] px-5 py-3">
            <Smartphone className="h-4 w-4 text-ink-5" strokeWidth={1.75} />
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">Mobile</span>
          </div>
          <div className="flex h-48 items-center justify-center bg-[var(--surface-1)]">
            <div className="space-y-2 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[var(--r-sm)] bg-[var(--surface-0)] border border-[color:var(--hairline)]"><Smartphone className="h-5 w-5 text-ink-5" strokeWidth={1.75} /></div>
              <p className="text-[12px] font-medium text-ink-5">Vista mobile</p>
              <p className="text-[11px] font-medium text-ink-6">375 × 812</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button disabled className="inline-flex items-center gap-2 h-10 px-5 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] text-[13px] font-medium text-ink-0 opacity-50" type="button">
          Previsualizar en vivo próximamente
        </button>
      </div>
    </div>
  );
}

/* ─── Shared ─── */

function SummaryCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-[var(--r-md)] border p-5", accent ? "border-transparent bg-ink-0" : "border-[color:var(--hairline)] bg-[var(--surface-0)]")}>
      <p className={cn("text-[10px] font-medium uppercase tracking-[0.14em]", accent ? "text-ink-11" : "text-ink-5")}>{label}</p>
      <p className={cn("mt-2 truncate text-[22px] font-semibold tracking-[-0.02em]", accent ? "text-ink-12" : "text-ink-0")} title={value}>{value}</p>
    </div>
  );
}

function NavCard({ icon, title, description, onClick }: { icon: React.ReactNode; title: string; description: string; onClick: () => void }) {
  return (
    <button className="group flex items-start gap-4 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5 text-left transition-colors hover:bg-[var(--surface-1)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]" onClick={onClick} type="button">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-sm)] bg-[var(--surface-1)] border border-[color:var(--hairline)] transition-colors group-hover:bg-[var(--surface-2)]">{icon}</div>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-ink-0">{title}</p>
        <p className="mt-1 truncate text-[11px] font-medium text-ink-5">{description}</p>
      </div>
      <span className="ml-auto shrink-0 text-ink-6 transition-colors group-hover:text-ink-0">→</span>
    </button>
  );
}

function FormBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">{label}</p>
      <p className="mt-2 text-[13px] font-medium text-ink-0">{value}</p>
    </div>
  );
}

function ColorField({ label, color, onAction }: { label: string; color: string; onAction: (a: string) => void }) {
  return (
    <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">{label}</p>
      <div className="mt-3 flex items-center gap-3">
        <ColorDot color={color} />
        <span className="font-mono text-[11px] font-semibold text-ink-0">{color}</span>
      </div>
    </div>
  );
}

function TableHead({ label }: { label: string }) {
  return <th className="px-6 py-3 text-left text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">{label}</th>;
}

function NoResultsState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
        <Search className="h-5 w-5 text-ink-5" strokeWidth={1.5} />
      </div>
      <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-ink-0">No encontramos resultados</h3>
      <p className="mt-2 max-w-md text-[13px] leading-[1.55] text-ink-5">Ajustá la búsqueda y volvé a intentarlo.</p>
    </div>
  );
}

function ToastViewport({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div aria-live="polite" className="fixed right-6 top-20 z-[60] flex w-full max-w-sm flex-col gap-3">
      {toasts.map((t) => (
        <div key={t.id} className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-4 shadow-[var(--shadow-overlay)] animate-in slide-in-from-right-5 fade-in duration-[var(--dur-slow)]">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-[13px] font-semibold text-ink-0">{t.title}</p><p className="mt-1 text-[12px] text-ink-5">{t.description}</p></div>
            <button aria-label="Cerrar" className="rounded-[var(--r-sm)] p-1 text-ink-5 transition-colors hover:bg-[var(--surface-2)] hover:text-ink-0" onClick={() => onDismiss(t.id)} type="button"><X className="h-4 w-4" /></button>
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
