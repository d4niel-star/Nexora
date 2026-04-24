"use client";

import { useMemo, useRef, useTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CreditCard,
  Eye,
  Globe,
  Package,
  Pencil,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Store as StorefrontIcon,
  Truck,
} from "lucide-react";

import {
  formatInternalStoreDomain,
  normalizeDomainHost,
  toHttpsUrl,
} from "@/components/admin/store/domain-utils";
import {
  createFirstStoreProductAction,
  publishStoreAction,
} from "@/lib/store-engine/actions";
import { cn } from "@/lib/utils";
import type { AdminStoreInitialData } from "@/types/store-engine";

type TabValue = "resumen" | "dominio" | "pagos";
type Tone = "success" | "warning" | "danger" | "neutral";

type ActionTarget = {
  actionLabel?: string;
  href?: string;
  onClick?: () => void;
  external?: boolean;
};

type OperationalRow = ActionTarget & {
  id: string;
  label: string;
  value: string;
  description: string;
  tone: Tone;
  monospace?: boolean;
};

type AlertItem = ActionTarget & {
  id: string;
  title: string;
  description: string;
  tone: "warning" | "danger";
};

type ChecklistEntry = ActionTarget & {
  id: string;
  title: string;
  description: string;
  done: boolean;
};

type ShortcutAction = ActionTarget & {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
};

const timeFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const solidButtonClasses =
  "inline-flex h-10 items-center gap-2 rounded-[var(--r-sm)] bg-ink-0 px-4 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)] disabled:cursor-not-allowed disabled:opacity-40";

const outlineButtonClasses =
  "inline-flex h-10 items-center gap-2 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-4 text-[13px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)] disabled:cursor-not-allowed disabled:opacity-40";

const inlineActionClasses =
  "inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-2 transition-colors hover:text-ink-0";

function buildPublicStoreUrl(
  initialData: AdminStoreInitialData | null,
  fallbackPath: string,
): string {
  const primaryHost = normalizeDomainHost(initialData?.store.primaryDomain);
  const internalHost = formatInternalStoreDomain(
    initialData?.store.subdomain,
    initialData?.store.slug,
  );

  const absoluteHostUrl = toHttpsUrl(primaryHost ?? internalHost);
  if (absoluteHostUrl) return absoluteHostUrl;

  if (typeof window !== "undefined" && fallbackPath.startsWith("/")) {
    return `${window.location.origin}${fallbackPath}`;
  }

  return fallbackPath;
}

export function StoreSummaryView({
  initialData,
  isLive,
  isMercadoPagoConnected,
  isOps,
  paymentsPlatformReady,
  onNavigate,
  onRefresh,
  pushToast,
  publicPath,
}: {
  initialData: AdminStoreInitialData | null;
  isLive: boolean;
  isMercadoPagoConnected: boolean;
  isOps: boolean;
  paymentsPlatformReady: boolean;
  onNavigate: (tab: TabValue) => void;
  onRefresh: () => void;
  pushToast: (title: string, description: string) => void;
  publicPath: string;
}) {
  const [isPublishing, startPublishing] = useTransition();
  const firstProductRef = useRef<HTMLDivElement | null>(null);

  const model = useMemo(() => {
    const productCount = initialData?.counts.products ?? 0;
    const publishedProducts = initialData?.counts.publishedProducts ?? 0;
    const sellableProducts = initialData?.counts.sellableProducts ?? 0;
    const hasShippingConfigured = initialData?.checkout.hasShippingConfigured ?? false;
    const activeShippingMethods = initialData?.checkout.activeShippingMethods ?? 0;
    const policiesReady = initialData?.checkout.policiesReady ?? false;
    const businessInfoReady = initialData?.checkout.businessInfoReady ?? false;
    const paymentStatus = initialData?.paymentProvider?.status ?? "disconnected";
    const paymentNeedsAttention =
      paymentStatus === "disconnected" ||
      paymentStatus === "needs_reconnection" ||
      paymentStatus === "error";
    const legalReady = policiesReady && businessInfoReady;
    const checkoutReady =
      paymentsPlatformReady &&
      isMercadoPagoConnected &&
      hasShippingConfigured &&
      legalReady;

    const internalDomain = formatInternalStoreDomain(
      initialData?.store.subdomain,
      initialData?.store.slug,
    );
    const primaryDomain =
      normalizeDomainHost(initialData?.store.primaryDomain) ?? internalDomain ?? "sin dominio";
    const customDomains = initialData?.domains ?? [];
    const activeCustomDomains = customDomains.filter((domain) => domain.status === "active");
    const domainAttention = customDomains.find(
      (domain) => domain.status === "failed" || domain.status === "pending",
    );
    const usingInternalDomain = !internalDomain
      ? false
      : normalizeDomainHost(primaryDomain) === normalizeDomainHost(internalDomain);

    const hasUnpublishedChanges = initialData?.summary.hasUnpublishedChanges ?? true;
    const lastPublishedAt = initialData?.summary.lastPublishedAt
      ? timeFormatter.format(new Date(initialData.summary.lastPublishedAt))
      : null;

    const alerts: AlertItem[] = [];

    if (sellableProducts === 0) {
      alerts.push({
        id: "products",
        title: "No hay productos vendibles",
        description:
          "La tienda no puede salir en vivo sin al menos un producto publicado con stock.",
        tone: "danger",
        actionLabel: productCount === 0 ? "Crear primer SKU" : "Ir a catalogo",
        onClick:
          productCount === 0
            ? () => firstProductRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
            : undefined,
        href: productCount === 0 ? undefined : "/admin/catalog",
      });
    }

    if (!paymentsPlatformReady) {
      alerts.push({
        id: "platform-payments",
        title: "Mercado Pago bloqueado por plataforma",
        description: isOps
          ? "Falta completar la configuracion global para poder iniciar OAuth y cobrar."
          : "La plataforma aun no habilito la integracion de cobro para esta tienda.",
        tone: "danger",
        actionLabel: "Revisar pagos",
        onClick: () => onNavigate("pagos"),
      });
    } else if (paymentStatus === "needs_reconnection" || paymentStatus === "error") {
      alerts.push({
        id: "payments-health",
        title: "Mercado Pago requiere atencion",
        description:
          "El proveedor esta conectado con errores o necesita reautorizacion antes de cobrar con normalidad.",
        tone: "danger",
        actionLabel: "Abrir pagos",
        onClick: () => onNavigate("pagos"),
      });
    } else if (paymentStatus === "disconnected") {
      alerts.push({
        id: "payments-missing",
        title: "Cobro pendiente",
        description:
          "La tienda puede prepararse, pero el checkout no cobrara hasta vincular una cuenta real.",
        tone: "warning",
        actionLabel: "Configurar pagos",
        onClick: () => onNavigate("pagos"),
      });
    }

    if (!hasShippingConfigured) {
      alerts.push({
        id: "shipping",
        title: "No hay envios activos",
        description:
          "El checkout queda incompleto mientras no exista al menos un metodo de envio habilitado.",
        tone: "warning",
        actionLabel: "Configurar envios",
        href: "/admin/shipping",
      });
    }

    if (!legalReady) {
      alerts.push({
        id: "legal",
        title: "Faltan legales o datos comerciales",
        description:
          "Conviene completar politicas y razon social para operar de forma mas clara y profesional.",
        tone: "warning",
        actionLabel: "Completar legales",
        href: "/admin/settings/legal",
      });
    }

    if (domainAttention) {
      alerts.push({
        id: "domain-attention",
        title:
          domainAttention.status === "failed"
            ? "El dominio necesita correccion"
            : "El dominio todavia no propago",
        description:
          domainAttention.status === "failed"
            ? `El dominio ${domainAttention.hostname} no pudo validarse y requiere revisar DNS.`
            : `El dominio ${domainAttention.hostname} esta enlazado pero aun espera propagacion DNS.`,
        tone: domainAttention.status === "failed" ? "danger" : "warning",
        actionLabel: "Revisar dominio",
        onClick: () => onNavigate("dominio"),
      });
    } else if (usingInternalDomain) {
      alerts.push({
        id: "internal-domain",
        title: "Seguis usando el subdominio interno",
        description:
          "La tienda ya funciona, pero todavia no tiene un dominio propio como frente comercial.",
        tone: "warning",
        actionLabel: "Conectar dominio",
        onClick: () => onNavigate("dominio"),
      });
    }

    if (!isLive) {
      alerts.push({
        id: "publication-state",
        title: "La tienda sigue en borrador",
        description:
          sellableProducts > 0
            ? "Ya tenes base para publicarla, pero todavia no esta visible para clientes."
            : "Todavia no hay base suficiente para publicar sin friccion.",
        tone: sellableProducts > 0 ? "warning" : "danger",
      });
    } else if (hasUnpublishedChanges) {
      alerts.push({
        id: "publish-pending",
        title: "Hay cambios sin publicar",
        description:
          "La tienda esta en vivo, pero la version visible no incluye las ultimas modificaciones.",
        tone: "warning",
      });
    }

    const operationalRows: OperationalRow[] = [
      {
        id: "store-state",
        label: "Estado de tienda",
        value: isLive ? "En vivo" : sellableProducts > 0 ? "Lista para publicar" : "En preparacion",
        description: isLive
          ? "La tienda ya expone una version publica para clientes."
          : sellableProducts > 0
            ? "Hay base comercial lista; solo falta confirmar la publicacion."
            : "Todavia falta cargar un producto vendible para habilitar la salida en vivo.",
        tone: isLive ? "success" : sellableProducts > 0 ? "warning" : "danger",
      },
      {
        id: "publication",
        label: "Publicacion",
        value: hasUnpublishedChanges ? "Cambios pendientes" : "Al dia",
        description: lastPublishedAt
          ? `Ultima publicacion: ${lastPublishedAt}.`
          : "Todavia no existe una publicacion registrada.",
        tone: hasUnpublishedChanges ? "warning" : "success",
      },
      {
        id: "domain",
        label: "Dominio publico",
        value: primaryDomain,
        description: usingInternalDomain
          ? "La tienda publica usando el subdominio interno de Nexora."
          : `${activeCustomDomains.length} dominio${activeCustomDomains.length === 1 ? "" : "s"} activo${activeCustomDomains.length === 1 ? "" : "s"} conectado${activeCustomDomains.length === 1 ? "" : "s"}.`,
        tone: domainAttention
          ? domainAttention.status === "failed"
            ? "danger"
            : "warning"
          : usingInternalDomain
            ? "warning"
            : "success",
        actionLabel: "Abrir dominio",
        onClick: () => onNavigate("dominio"),
        monospace: true,
      },
    ];

    const checkoutRows: OperationalRow[] = [
      {
        id: "payments",
        label: "Cobro",
        value: !paymentsPlatformReady
          ? "Bloqueado por plataforma"
          : isMercadoPagoConnected
            ? "Mercado Pago conectado"
            : "Pendiente de conexion",
        description: !paymentsPlatformReady
          ? "La integracion global no esta lista para iniciar OAuth."
          : isMercadoPagoConnected
            ? "La tienda ya puede cobrar con la cuenta vinculada."
            : "Hace falta vincular Mercado Pago antes de operar con cobros reales.",
        tone: !paymentsPlatformReady
          ? "danger"
          : isMercadoPagoConnected
            ? "success"
            : paymentNeedsAttention
              ? "warning"
              : "neutral",
        actionLabel: "Abrir pagos",
        onClick: () => onNavigate("pagos"),
      },
      {
        id: "shipping",
        label: "Envios",
        value: hasShippingConfigured
          ? `${activeShippingMethods} metodo${activeShippingMethods === 1 ? "" : "s"} activo${activeShippingMethods === 1 ? "" : "s"}`
          : "Sin configurar",
        description: hasShippingConfigured
          ? "El checkout ya cuenta con al menos una opcion de entrega habilitada."
          : "Configura envios para evitar friccion y bloqueos operativos en checkout.",
        tone: hasShippingConfigured ? "success" : "warning",
        actionLabel: "Configurar",
        href: "/admin/shipping",
      },
      {
        id: "legal",
        label: "Legales",
        value: legalReady ? "Completos" : "Incompletos",
        description: legalReady
          ? "Politicas y datos comerciales disponibles para una operacion mas clara."
          : "Faltan politicas o informacion comercial para cerrar el frente operativo.",
        tone: legalReady ? "success" : "warning",
        actionLabel: "Completar",
        href: "/admin/settings/legal",
      },
    ];

    const checklist: ChecklistEntry[] = [
      {
        id: "products",
        title: "Catalogo vendible",
        description:
          sellableProducts > 0
            ? `${sellableProducts} producto${sellableProducts === 1 ? "" : "s"} con stock y publicacion activa.`
            : "Aun no existe un SKU listo para vender.",
        done: sellableProducts > 0,
        actionLabel: productCount === 0 ? "Crear primer SKU" : "Ir a catalogo",
        onClick:
          productCount === 0
            ? () => firstProductRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
            : undefined,
        href: productCount === 0 ? undefined : "/admin/catalog",
      },
      {
        id: "publication",
        title: "Publicacion al dia",
        description: isLive
          ? hasUnpublishedChanges
            ? "La tienda esta en vivo, pero faltan publicar los ultimos cambios."
            : "La version publica ya refleja el estado actual de la tienda."
          : "Todavia no esta publicada para clientes.",
        done: isLive && !hasUnpublishedChanges,
      },
      {
        id: "payments",
        title: "Cobro operativo",
        description: checkoutReady
          ? "Pagos, envios y legales sostienen un checkout listo para operar."
          : "Todavia falta cerrar pagos, envios o legales para cobrar con menos friccion.",
        done: checkoutReady,
        actionLabel: "Ver pagos",
        onClick: () => onNavigate("pagos"),
      },
      {
        id: "domain",
        title: "Dominio profesional",
        description: usingInternalDomain
          ? "La tienda aun usa el dominio interno de Nexora."
          : "La marca ya expone un dominio propio hacia clientes.",
        done: !usingInternalDomain && !domainAttention,
        actionLabel: "Gestionar dominio",
        onClick: () => onNavigate("dominio"),
      },
      {
        id: "legal",
        title: "Legales y datos comerciales",
        description: legalReady
          ? "Politicas y business info completas."
          : "Falta completar politicas o datos comerciales.",
        done: legalReady,
        actionLabel: "Abrir legales",
        href: "/admin/settings/legal",
      },
    ];

    const quickActions: ShortcutAction[] = [
      productCount === 0
        ? {
            id: "first-product",
            title: "Crear primer SKU",
            description: "Carga un producto vendible sin salir de Mi tienda.",
            icon: <Package className="h-4 w-4" />,
            onClick: () =>
              firstProductRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
          }
        : {
            id: "catalog",
            title: "Catalogo",
            description: "Agregar o corregir productos, stock y publicacion.",
            icon: <Package className="h-4 w-4" />,
            href: "/admin/catalog",
          },
      {
        id: "domain",
        title: "Dominio",
        description: "Revisar DNS, dominio principal y propagacion.",
        icon: <Globe className="h-4 w-4" />,
        onClick: () => onNavigate("dominio"),
      },
      {
        id: "payments",
        title: "Pagos",
        description: "Conectar Mercado Pago o corregir reconexion.",
        icon: <CreditCard className="h-4 w-4" />,
        onClick: () => onNavigate("pagos"),
      },
      {
        id: "shipping",
        title: "Envios",
        description: "Activar metodos de entrega para checkout.",
        icon: <Truck className="h-4 w-4" />,
        href: "/admin/shipping",
      },
      {
        id: "legal",
        title: "Legales",
        description: "Completar politicas y datos comerciales.",
        icon: <ShieldCheck className="h-4 w-4" />,
        href: "/admin/settings/legal",
      },
      {
        id: "store-ai",
        title: "Tienda IA",
        description: "Branding, navegacion y contenido editorial.",
        icon: <Sparkles className="h-4 w-4" />,
        href: "/admin/store-ai",
      },
    ];

    const blockingCount = alerts.filter((alert) => alert.tone === "danger").length;
    const warningCount = alerts.filter((alert) => alert.tone === "warning").length;

    const heroTitle =
      blockingCount > 0
        ? "Hay bloqueos operativos a resolver"
        : warningCount > 0
          ? "La tienda esta encaminada, pero todavia no cierra del todo"
          : "La operacion esta estable y lista para vender";

    const heroDescription =
      blockingCount > 0
        ? "Resumen concentra lo que hoy frena publicacion, cobro o claridad operativa para que puedas resolverlo rapido."
        : warningCount > 0
          ? "No hay un bloqueo critico, pero todavia quedan frentes abiertos en dominio, checkout o publicacion."
          : "Publicacion, dominio, checkout y cobro quedaron alineados. Mi tienda pasa a funcionar como centro operativo real.";

    return {
      productCount,
      publishedProducts,
      sellableProducts,
      activeShippingMethods,
      legalReady,
      checkoutReady,
      primaryDomain,
      usingInternalDomain,
      hasUnpublishedChanges,
      lastPublishedAt,
      alerts,
      operationalRows,
      checkoutRows,
      checklist,
      quickActions,
      blockingCount,
      warningCount,
      heroTitle,
      heroDescription,
      publicStoreUrl: buildPublicStoreUrl(initialData, publicPath),
    };
  }, [
    initialData,
    isLive,
    isMercadoPagoConnected,
    isOps,
    onNavigate,
    paymentsPlatformReady,
    publicPath,
  ]);

  const handlePublish = () => {
    startPublishing(async () => {
      try {
        await publishStoreAction();
        pushToast("Publicacion actualizada", "La tienda quedo publicada correctamente.");
        onRefresh();
      } catch (error) {
        pushToast(
          "No se pudo publicar",
          error instanceof Error ? error.message : "Ocurrio un error al publicar la tienda.",
        );
      }
    });
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(model.publicStoreUrl);
      pushToast("Link copiado", "La URL publica de la tienda ya esta en el portapapeles.");
    } catch {
      pushToast("No se pudo copiar", "Intenta nuevamente desde un navegador con permisos.");
    }
  };

  if (!initialData) {
    return (
      <div className="p-6">
        <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
          <h2 className="text-[18px] font-semibold text-ink-0">No encontramos datos de la tienda</h2>
          <p className="mt-2 text-[13px] leading-[1.55] text-ink-5">
            La superficie operativa necesita una tienda cargada para poder mostrar dominio,
            checkout y pagos.
          </p>
        </div>
      </div>
    );
  }

  const showPublishButton = !isLive || model.hasUnpublishedChanges;
  const primaryActionDisabled = model.sellableProducts === 0 || isPublishing;

  return (
    <div className="space-y-6 p-6">
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)]"
      >
        <div className="grid gap-6 p-6 xl:grid-cols-[1.4fr_0.9fr] xl:items-start">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-5">
              <StorefrontIcon className="h-3.5 w-3.5" />
              Resumen operativo
            </div>
            <div className="space-y-2">
              <h2 className="text-[26px] font-semibold leading-[1.08] tracking-[-0.03em] text-ink-0">
                {model.heroTitle}
              </h2>
              <p className="max-w-2xl text-[13.5px] leading-[1.6] text-ink-5">
                {model.heroDescription}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {showPublishButton ? (
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={primaryActionDisabled}
                  className={solidButtonClasses}
                >
                  <Eye className="h-3.5 w-3.5" />
                  {isPublishing
                    ? "Publicando..."
                    : isLive
                      ? "Publicar cambios"
                      : "Publicar tienda"}
                </button>
              ) : (
                <a
                  href={model.publicStoreUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={solidButtonClasses}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Ver tienda
                </a>
              )}

              <a
                href={model.publicStoreUrl}
                target="_blank"
                rel="noreferrer"
                className={outlineButtonClasses}
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                Abrir storefront
              </a>

              <button type="button" onClick={handleShare} className={outlineButtonClasses}>
                <ArrowRight className="h-3.5 w-3.5" />
                Copiar link
              </button>

              <button type="button" onClick={onRefresh} className={outlineButtonClasses}>
                <RefreshCw className="h-3.5 w-3.5" />
                Actualizar
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <HeroStat
              label="Productos vendibles"
              value={model.sellableProducts.toString()}
              description={`${model.publishedProducts} publicados`}
            />
            <HeroStat
              label="Dominio principal"
              value={model.primaryDomain}
              description={model.usingInternalDomain ? "Subdominio Nexora" : "Dominio propio"}
              monospace
            />
            <HeroStat
              label="Ultima publicacion"
              value={model.lastPublishedAt ?? "Nunca"}
              description={
                model.hasUnpublishedChanges ? "Hay cambios pendientes" : "Vista publica al dia"
              }
            />
            <HeroStat
              label="Alertas activas"
              value={(model.blockingCount + model.warningCount).toString()}
              description={
                model.blockingCount > 0
                  ? `${model.blockingCount} bloqueante${model.blockingCount === 1 ? "" : "s"}`
                  : "Sin bloqueos criticos"
              }
            />
          </div>
        </div>
      </motion.section>

      {model.productCount === 0 ? (
        <div ref={firstProductRef}>
          <FirstProductPanel onRefresh={onRefresh} pushToast={pushToast} />
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.85fr]">
        <div className="space-y-5">
          <SectionCard
            eyebrow="Estado general"
            title="Operacion esencial"
            description="Lo minimo que tiene que estar resuelto para que la tienda funcione con criterio operativo."
          >
            <OperationalRows rows={model.operationalRows} />
          </SectionCard>

          <SectionCard
            eyebrow="Checkout y cobro"
            title="Lo que sostiene la conversion"
            description="Pagos, envios y legales en un mismo bloque para detectar rapido donde se corta el flujo."
          >
            <OperationalRows rows={model.checkoutRows} />
          </SectionCard>
        </div>

        <div className="space-y-5">
          <SectionCard
            eyebrow="Estado y alertas"
            title="Lo que requiere atencion"
            description="Alertas visibles y priorizadas para actuar sin entrar al editor ni recorrer otras areas."
          >
            <AlertsList alerts={model.alerts} />
          </SectionCard>

          <SectionCard
            eyebrow="Checklist operativo"
            title="Frentes a cerrar"
            description="Confirmacion rapida de lo que ya esta listo y de lo que todavia necesita accion."
          >
            <ChecklistList entries={model.checklist} />
          </SectionCard>

          <SectionCard
            eyebrow="Acciones rapidas"
            title="Atajos utiles"
            description="Solo accesos de alto valor para resolver tareas frecuentes sin ruido."
          >
            <QuickActions actions={model.quickActions} />
          </SectionCard>
        </div>
      </div>

      <div className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-5 py-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[12px] font-medium text-ink-0">
              El trabajo editorial sigue fuera de Mi tienda
            </p>
            <p className="mt-1 text-[12px] leading-[1.55] text-ink-5">
              Branding, tema, navegacion y paginas quedaron fuera del cockpit para no duplicar
              Tienda IA.
            </p>
          </div>
          <Link href="/admin/store-ai" className={inlineActionClasses}>
            Abrir Tienda IA
            <Pencil className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function FirstProductPanel({
  onRefresh,
  pushToast,
}: {
  onRefresh: () => void;
  pushToast: (title: string, description: string) => void;
}) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        await createFirstStoreProductAction(formData);
        form.reset();
        pushToast("Producto creado", "Ya tenes un primer SKU con variante, precio y stock.");
        onRefresh();
      } catch (error) {
        pushToast(
          "No se pudo crear",
          error instanceof Error ? error.message : "Ocurrio un error al crear el producto.",
        );
      }
    });
  };

  const inputClasses =
    "h-11 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-3.5 text-[13px] font-medium text-ink-0 outline-none transition-[box-shadow,border-color] placeholder:text-ink-6 focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)]";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[var(--r-md)] border border-[color:color-mix(in_srgb,var(--signal-warning)_24%,transparent)] bg-[color:color-mix(in_srgb,var(--signal-warning)_6%,var(--surface-0))] p-5"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--signal-warning)]">
            Accion inmediata
          </p>
          <h3 className="mt-2 text-[17px] font-semibold tracking-[-0.015em] text-ink-0">
            Carga el primer SKU sin salir de Mi tienda
          </h3>
          <p className="mt-1 max-w-2xl text-[13px] leading-[1.6] text-ink-5">
            Este bloque existe porque sin un producto vendible la operacion no despega. Crea una
            base real con stock y precio, y despues afinas el resto desde Catalogo.
          </p>
        </div>
        <button type="submit" disabled={isPending} className={solidButtonClasses}>
          <Save className="h-3.5 w-3.5" />
          {isPending ? "Creando..." : "Crear producto"}
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <input className={inputClasses} name="title" placeholder="Nombre del producto" required />
        <input className={inputClasses} name="variantTitle" placeholder="Variante" />
        <input
          className={inputClasses}
          min="1"
          name="price"
          placeholder="Precio"
          required
          step="0.01"
          type="number"
        />
        <input
          className={inputClasses}
          min="0"
          name="stock"
          placeholder="Stock"
          required
          step="1"
          type="number"
        />
        <input className={cn(inputClasses, "md:col-span-2")} name="category" placeholder="Categoria" />
        <input
          className={cn(inputClasses, "md:col-span-2")}
          name="featuredImage"
          placeholder="URL de imagen"
          type="url"
        />
        <textarea
          className={cn(inputClasses, "min-h-24 md:col-span-2 xl:col-span-4")}
          name="description"
          placeholder="Descripcion breve"
        />
      </div>
    </form>
  );
}

function SectionCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5">
      <div className="mb-4 space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-5">
          {eyebrow}
        </p>
        <h3 className="text-[17px] font-semibold tracking-[-0.015em] text-ink-0">{title}</h3>
        <p className="max-w-2xl text-[12.5px] leading-[1.55] text-ink-5">{description}</p>
      </div>
      {children}
    </section>
  );
}

function OperationalRows({ rows }: { rows: OperationalRow[] }) {
  return (
    <div className="divide-y divide-[color:var(--hairline)]">
      {rows.map((row) => (
        <div key={row.id} className="grid gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[1fr_auto] md:items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-medium text-ink-0">{row.label}</p>
              <ToneBadge tone={row.tone} />
            </div>
            <p className="text-[12px] leading-[1.55] text-ink-5">{row.description}</p>
          </div>
          <div className="space-y-2 md:text-right">
            <p
              className={cn(
                "text-[13px] font-semibold text-ink-0",
                row.monospace && "font-mono text-[12px]",
              )}
            >
              {row.value}
            </p>
            <RowAction row={row} />
          </div>
        </div>
      ))}
    </div>
  );
}

function AlertsList({ alerts }: { alerts: AlertItem[] }) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-[var(--r-sm)] border border-[color:color-mix(in_srgb,var(--signal-success)_24%,transparent)] bg-[color:color-mix(in_srgb,var(--signal-success)_6%,var(--surface-0))] px-4 py-3">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-[color:var(--signal-success)]" />
          <div>
            <p className="text-[13px] font-medium text-ink-0">Sin alertas relevantes</p>
            <p className="mt-1 text-[12px] leading-[1.55] text-ink-5">
              La operacion basica de la tienda no muestra bloqueos dentro del scope actual.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={cn(
            "rounded-[var(--r-sm)] border px-4 py-3",
            alert.tone === "danger"
              ? "border-[color:color-mix(in_srgb,var(--signal-danger)_24%,transparent)] bg-[color:color-mix(in_srgb,var(--signal-danger)_6%,var(--surface-0))]"
              : "border-[color:color-mix(in_srgb,var(--signal-warning)_24%,transparent)] bg-[color:color-mix(in_srgb,var(--signal-warning)_6%,var(--surface-0))]",
          )}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0",
                alert.tone === "danger"
                  ? "text-[color:var(--signal-danger)]"
                  : "text-[color:var(--signal-warning)]",
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-ink-0">{alert.title}</p>
              <p className="mt-1 text-[12px] leading-[1.55] text-ink-5">{alert.description}</p>
              <RowAction row={alert} className="mt-2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ChecklistList({ entries }: { entries: ChecklistEntry[] }) {
  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-4 py-3"
        >
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                entry.done
                  ? "border-[color:color-mix(in_srgb,var(--signal-success)_32%,transparent)] bg-[color:color-mix(in_srgb,var(--signal-success)_10%,transparent)] text-[color:var(--signal-success)]"
                  : "border-[color:var(--hairline)] bg-[var(--surface-1)] text-ink-5",
              )}
            >
              {entry.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-medium text-ink-0">{entry.title}</p>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
                    entry.done
                      ? "bg-[color:color-mix(in_srgb,var(--signal-success)_12%,transparent)] text-[color:var(--signal-success)]"
                      : "bg-[var(--surface-1)] text-ink-5",
                  )}
                >
                  {entry.done ? "Listo" : "Pendiente"}
                </span>
              </div>
              <p className="mt-1 text-[12px] leading-[1.55] text-ink-5">{entry.description}</p>
              <RowAction row={entry} className="mt-2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function QuickActions({ actions }: { actions: ShortcutAction[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {actions.map((action) => {
        const content = (
          <>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] text-ink-2">
              {action.icon}
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-ink-0">{action.title}</p>
              <p className="mt-1 text-[12px] leading-[1.5] text-ink-5">{action.description}</p>
            </div>
            <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-ink-6 transition-colors group-hover:text-ink-0" />
          </>
        );

        const className =
          "group flex items-start gap-3 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-4 text-left transition-colors hover:bg-[var(--surface-1)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]";

        if (action.href) {
          return (
            <Link key={action.id} href={action.href} className={className}>
              {content}
            </Link>
          );
        }

        return (
          <button key={action.id} type="button" onClick={action.onClick} className={className}>
            {content}
          </button>
        );
      })}
    </div>
  );
}

function HeroStat({
  label,
  value,
  description,
  monospace = false,
}: {
  label: string;
  value: string;
  description: string;
  monospace?: boolean;
}) {
  return (
    <div className="rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-5">{label}</p>
      <p
        className={cn(
          "mt-2 text-[16px] font-semibold tracking-[-0.015em] text-ink-0",
          monospace && "font-mono text-[13px]",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-[11.5px] text-ink-5">{description}</p>
    </div>
  );
}

function ToneBadge({ tone }: { tone: Tone }) {
  const copy =
    tone === "success"
      ? "Ok"
      : tone === "warning"
        ? "Atencion"
        : tone === "danger"
          ? "Bloqueo"
          : "Info";

  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
        tone === "success" &&
          "bg-[color:color-mix(in_srgb,var(--signal-success)_12%,transparent)] text-[color:var(--signal-success)]",
        tone === "warning" &&
          "bg-[color:color-mix(in_srgb,var(--signal-warning)_12%,transparent)] text-[color:var(--signal-warning)]",
        tone === "danger" &&
          "bg-[color:color-mix(in_srgb,var(--signal-danger)_12%,transparent)] text-[color:var(--signal-danger)]",
        tone === "neutral" && "bg-[var(--surface-1)] text-ink-5",
      )}
    >
      {copy}
    </span>
  );
}

function RowAction({
  row,
  className,
}: {
  row: ActionTarget;
  className?: string;
}) {
  if (!row.actionLabel) return null;

  if (row.href) {
    if (row.external) {
      return (
        <a
          href={row.href}
          target="_blank"
          rel="noreferrer"
          className={cn(inlineActionClasses, className)}
        >
          {row.actionLabel}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      );
    }

    return (
      <Link href={row.href} className={cn(inlineActionClasses, className)}>
        {row.actionLabel}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    );
  }

  if (row.onClick) {
    return (
      <button type="button" onClick={row.onClick} className={cn(inlineActionClasses, className)}>
        {row.actionLabel}
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    );
  }

  return null;
}
