"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Check,
  CreditCard,
  Eye,
  Globe,
  Layers,
  Pencil,
  Save,
  Share2,
  Sparkles,
  X,
} from "lucide-react";

import { ColorDot } from "@/components/admin/store/StoreBadge";
import { DomainSettingsView } from "@/components/admin/store/tabs/DomainSettingsView";
import { TableSkeleton } from "@/components/admin/orders/TableSkeleton";
import { cn } from "@/lib/utils";

import {
  createFirstStoreProductAction,
  publishStoreAction,
} from "@/lib/store-engine/actions";
import type { AdminStoreInitialData } from "@/types/store-engine";
import type { StoreSummary, StoreStatus } from "@/types/store";
import type { MercadoPagoPlatformReadiness } from "@/lib/payments/mercadopago/platform-readiness";

// ─── Mi tienda — superficie operativa ───────────────────────────────────
//
// Responsabilidad única: mostrar el estado operativo de la tienda y
// resolver dominio y pagos. TODO lo que sea edición de diseño —
// branding, navegación, páginas, secciones del home, tema — vive en
// `Tienda IA` (/admin/store-ai y /admin/store-ai/editor). Mantener
// esas tabs aquí significaba duplicar fuentes de verdad sobre el mismo
// StoreBranding / StoreNavItem / StorePage, ofrecer ediciones parciales
// (Navegación y Páginas estaban solo en modo lectura) y diluir el foco
// de esta pantalla.

type TabValue = "resumen" | "dominio" | "pagos";

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
  // Back-compat: old deep links pointing at branding / navegacion / paginas
  // (and the never-implemented `home`) fall back to "resumen" so nothing
  // crashes when external readiness/onboarding links are stale.
  const initialTab: TabValue =
    tabParam === "dominio" || tabParam === "pagos" ? tabParam : "resumen";
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);
  const [isLoading, setIsLoading] = useState(true);
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

  const publicPath = initialData?.publicUrl ?? (initialData ? `/store/${initialData.store.slug}` : "#");
  const publicUrl = typeof window === "undefined" || publicPath === "#" ? publicPath : `${window.location.origin}${publicPath}`;
  const paymentStatus = initialData?.paymentProvider?.status ?? "disconnected";
  const isMercadoPagoConnected = paymentStatus === "connected" && !!initialData?.paymentProvider;
  const isLive = initialData?.store.status === "active" && (initialData?.counts.sellableProducts ?? 0) > 0;

  useEffect(() => { if (!isLoading) return; const t = window.setTimeout(() => setIsLoading(false), 720); return () => window.clearTimeout(t); }, [isLoading]);

  const tabs: Array<{ label: string; value: TabValue; icon: React.ReactNode }> = [
    { label: "Resumen", value: "resumen", icon: <Layers className="h-3.5 w-3.5" /> },
    { label: "Dominio", value: "dominio", icon: <Globe className="h-3.5 w-3.5" /> },
    { label: "Pagos", value: "pagos", icon: <CreditCard className="h-3.5 w-3.5" /> },
  ];

  const handleTabChange = (v: TabValue) => { if (v === activeTab) return; setActiveTab(v); setIsLoading(true); };

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

  const refreshData = () => router.refresh();
  const handleAction = (action: string) => { pushToast("Información", action); };

  return (
    <div className="animate-in fade-in space-y-8 pb-32 duration-700">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1 className="text-[28px] lg:text-[32px] font-semibold leading-[1.08] tracking-[-0.035em] text-ink-0">Mi tienda.</h1>
          <p className="mt-2 text-[14px] leading-[1.55] text-ink-5">Estado general, dominio y pagos. El diseño visual se edita en Tienda IA.</p>
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
          ) : activeTab === "dominio" ? (
            <DomainSettingsView initialData={initialData!} onAction={handleAction} storeId={initialData?.store.id} />
          ) : (
            <PaymentsView
              initialData={initialData ?? null}
              isConnected={isMercadoPagoConnected}
              onAction={handleAction}
              publicPath={publicPath}
              platformReadiness={mercadoPagoPlatformReadiness}
              isOps={isOps}
            />
          )}
        </div>
      </div>

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NavCard
          icon={<Sparkles className="h-5 w-5 text-ink-4" strokeWidth={1.75} />}
          title="Tienda IA"
          description="Diseño, branding, navegación y páginas"
          href="/admin/store-ai"
        />
        <NavCard
          icon={<Globe className="h-5 w-5 text-ink-4" strokeWidth={1.75} />}
          title="Dominio"
          description={s.domain}
          onClick={() => onNavigate("dominio")}
        />
        <NavCard
          icon={<CreditCard className="h-5 w-5 text-ink-4" strokeWidth={1.75} />}
          title="Pagos"
          description={isMercadoPagoConnected ? "Conectado" : "Pendiente"}
          onClick={() => onNavigate("pagos")}
        />
      </div>

      <div className="flex items-center gap-3">
        <button className="inline-flex items-center gap-2 h-10 px-5 rounded-[var(--r-sm)] bg-ink-0 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]" disabled={isPublishing || sellableProducts === 0} onClick={handlePublish} type="button">
          <Eye className="h-3.5 w-3.5" />
          {isPublishing ? "Publicando..." : "Publicar tienda"}
        </button>
        <Link href="/admin/store-ai/editor" className="inline-flex items-center gap-2 h-10 px-5 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] text-[13px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]">
          <Pencil className="h-3.5 w-3.5" />
          Editor de tema
        </Link>
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

/* ─── Payments ─── */

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

/* ─── Shared ─── */

function SummaryCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-[var(--r-md)] border p-5", accent ? "border-transparent bg-ink-0" : "border-[color:var(--hairline)] bg-[var(--surface-0)]")}>
      <p className={cn("text-[10px] font-medium uppercase tracking-[0.14em]", accent ? "text-ink-11" : "text-ink-5")}>{label}</p>
      <p className={cn("mt-2 truncate text-[22px] font-semibold tracking-[-0.02em]", accent ? "text-ink-12" : "text-ink-0")} title={value}>{value}</p>
    </div>
  );
}

function NavCard({
  icon,
  title,
  description,
  onClick,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
  href?: string;
}) {
  const inner = (
    <>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-sm)] bg-[var(--surface-1)] border border-[color:var(--hairline)] transition-colors group-hover:bg-[var(--surface-2)]">{icon}</div>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-ink-0">{title}</p>
        <p className="mt-1 truncate text-[11px] font-medium text-ink-5">{description}</p>
      </div>
      <span className="ml-auto shrink-0 text-ink-6 transition-colors group-hover:text-ink-0">→</span>
    </>
  );
  const cls = "group flex items-start gap-4 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5 text-left transition-colors hover:bg-[var(--surface-1)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]";
  if (href) {
    return (
      <Link className={cls} href={href}>
        {inner}
      </Link>
    );
  }
  return (
    <button className={cls} onClick={onClick} type="button">
      {inner}
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
