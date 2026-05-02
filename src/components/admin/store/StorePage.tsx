"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  CreditCard,
  Globe,
  Layers,
  MessageSquare,
  RefreshCw,
  X,
} from "lucide-react";

import {
  formatInternalStoreDomain,
  normalizeDomainHost,
} from "@/components/admin/store/domain-utils";
import { StoreSummaryView } from "@/components/admin/store/StoreSummaryView";
import { DomainSettingsView } from "@/components/admin/store/tabs/DomainSettingsView";
import { PaymentsHub } from "@/components/admin/store/tabs/PaymentsHub";
import { CommunicationPage } from "@/components/admin/communication/CommunicationPage";
import { cn } from "@/lib/utils";
import type { MercadoPagoPlatformReadiness } from "@/lib/payments/mercadopago/platform-readiness";
import type {
  PaymentProviderConnectionView,
  PaymentProviderStatus,
} from "@/lib/payments/types";
import type { AdminStoreInitialData } from "@/types/store-engine";
import type { CommunicationSettings } from "@/lib/communication/types";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";

type TabValue = "resumen" | "comunicacion" | "dominio" | "pagos";

interface ToastMessage {
  id: string;
  title: string;
  description: string;
}



function resolveStoreTab(tab: string | null): TabValue {
  if (tab === "dominio" || tab === "pagos" || tab === "comunicacion") return tab;
  return "resumen";
}

function mpReasonCopy(reason: string): { title: string; description: string } {
  switch (reason) {
    case "invalid_grant":
      return {
        title: "Codigo de autorizacion invalido",
        description:
          "El codigo de Mercado Pago ya fue usado o expiro. Volve a iniciar la conexion desde cero.",
      };
    case "invalid_client":
      return {
        title: "Credenciales rechazadas",
        description:
          "Mercado Pago rechazo la aplicacion configurada. Revisa el setup global de la plataforma.",
      };
    case "invalid_redirect_uri":
      return {
        title: "Redirect URI no autorizada",
        description:
          "La URL de retorno no coincide con la configurada en Mercado Pago. Hace falta corregir la integracion.",
      };
    case "same_account":
      return {
        title: "Cuenta no permitida",
        description:
          "La cuenta de Mercado Pago que creo la aplicacion no puede vincularse como tienda cobradora.",
      };
    case "no_access_token":
      return {
        title: "Respuesta incompleta",
        description:
          "Mercado Pago respondio sin access token. Reintenta la conexion desde la pestaña de pagos.",
      };
    case "network":
      return {
        title: "No se pudo contactar a Mercado Pago",
        description: "La conexion fallo antes de llegar a Mercado Pago. Reintenta en unos minutos.",
      };
    default:
      return {
        title: "No se pudo conectar",
        description:
          "Mercado Pago rechazo el intercambio. Revisa la configuracion de la aplicacion y vuelve a intentarlo.",
      };
  }
}

export function StorePage({
  initialData,
  mercadoPagoPlatformReadiness,
  isOps,
  communicationSettings,
}: {
  initialData?: AdminStoreInitialData | null;
  mercadoPagoPlatformReadiness: MercadoPagoPlatformReadiness;
  isOps: boolean;
  communicationSettings?: CommunicationSettings | null;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const urlTab = resolveStoreTab(searchParams.get("tab"));

  const [activeTab, setActiveTab] = useState<TabValue>(urlTab);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const prevUrlTab = useRef(urlTab);

  const publicPath =
    initialData?.publicUrl ?? (initialData ? `/store/${initialData.store.slug}` : "#");
  const paymentStatus = initialData?.paymentProvider?.status ?? "disconnected";
  const isMercadoPagoConnected =
    paymentStatus === "connected" && Boolean(initialData?.paymentProvider);
  const isPaymentsOperational =
    mercadoPagoPlatformReadiness.ready && isMercadoPagoConnected;
  const isLive =
    initialData?.store.status === "active" && (initialData?.counts.sellableProducts ?? 0) > 0;

  const activeDomain =
    normalizeDomainHost(initialData?.store.primaryDomain) ??
    formatInternalStoreDomain(initialData?.store.subdomain, initialData?.store.slug) ??
    "sin dominio";

  const hasDomainAttention = (initialData?.domains ?? []).some(
    (domain) => domain.status === "pending" || domain.status === "failed",
  );

  const paymentConnections: PaymentProviderConnectionView[] = useMemo(() => {
    return (initialData?.paymentProviders ?? []).map((provider) => ({
      provider: provider.provider,
      status: ((): PaymentProviderStatus => {
        switch (provider.status) {
          case "connected":
          case "disconnected":
          case "needs_reconnection":
          case "error":
            return provider.status;
          default:
            return "disconnected";
        }
      })(),
      externalAccountId: provider.externalAccountId,
      accountEmail: provider.accountEmail,
      publicKey: provider.publicKey,
      connectedAt: provider.connectedAt,
      lastValidatedAt: provider.lastValidatedAt,
      lastError: provider.lastError,
      config: provider.config,
    }));
  }, [initialData?.paymentProviders]);

  const pushToast = useCallback((title: string, description: string) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;

    setToasts((current) => [...current, { id, title, description }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3600);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  // Sync URL tab → component state (without triggering loading cycle)
  if (urlTab !== prevUrlTab.current) {
    prevUrlTab.current = urlTab;
    if (urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }

  useEffect(() => {
    const mp = searchParams.get("mp");
    if (!mp) return;

    if (mp === "connected") {
      pushToast("Mercado Pago conectado", "El checkout ya puede cobrar con la cuenta vinculada.");
      router.refresh();
    } else if (mp === "platform_not_ready" || mp === "missing_config") {
      pushToast(
        "Mercado Pago no esta listo",
        isOps
          ? "La plataforma tiene una configuracion incompleta. Revisa la integracion global."
          : "La plataforma todavia no habilito la integracion. Contacta al equipo operativo.",
      );
    } else if (mp === "invalid_state") {
      pushToast(
        "Conexion rechazada",
        "La respuesta OAuth no pertenece a esta sesion. Vuelve a iniciar la conexion.",
      );
    } else if (mp.startsWith("error_")) {
      const reason = mp.slice("error_".length);
      const copy = mpReasonCopy(reason);
      pushToast(copy.title, copy.description);
    } else if (mp === "error") {
      pushToast(
        "No se pudo conectar",
        "Mercado Pago rechazo la autorizacion. Revisa la integracion y vuelve a intentarlo.",
      );
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("mp");
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [isOps, pathname, pushToast, router, searchParams]);

  // Tab order is intentional and merchant-facing:
  //   1. Resumen        — overview / activation
  //   2. Comunicación   — contact, redes, WhatsApp, emails (sits between
  //                       Resumen and Dominio because it owns public
  //                       storefront-visible info, just like Dominio)
  //   3. Dominio        — public domain settings
  //   4. Pagos          — checkout providers
  const tabs: Array<{ label: string; value: TabValue; icon: React.ReactNode }> = [
    { label: "Resumen", value: "resumen", icon: <Layers className="h-3.5 w-3.5" /> },
    { label: "Comunicación", value: "comunicacion", icon: <MessageSquare className="h-3.5 w-3.5" /> },
    { label: "Dominio", value: "dominio", icon: <Globe className="h-3.5 w-3.5" /> },
    { label: "Pagos", value: "pagos", icon: <CreditCard className="h-3.5 w-3.5" /> },
  ];

  const handleTabChange = (tab: TabValue) => {
    if (tab === activeTab) return;
    setActiveTab(tab);

    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const refreshData = () => {
    router.refresh();
  };

  return (
    <div className="space-y-6 pb-32">
      <AdminPageHeader
        eyebrow="Centro operativo"
        title="Mi tienda"
        subtitle="Publicación, dominio, checkout y cobro. El trabajo editorial y visual vive en Tienda IA."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <HeaderPill
              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
              tone={isLive ? "success" : "neutral"}
              label={isLive ? "Tienda en vivo" : "Operación en borrador"}
            />
            <HeaderPill
              icon={<Globe className="h-3.5 w-3.5" />}
              tone={hasDomainAttention ? "warning" : "neutral"}
              label={activeDomain}
              monospace
            />
            <HeaderPill
              icon={<CreditCard className="h-3.5 w-3.5" />}
              tone={isPaymentsOperational ? "success" : "warning"}
              label={
                !mercadoPagoPlatformReadiness.ready
                  ? "Cobro bloqueado"
                  : isMercadoPagoConnected
                    ? "Cobro listo"
                    : "Cobro pendiente"
              }
            />
            <button
              type="button"
              onClick={refreshData}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-[color:var(--hairline-strong)] bg-[var(--surface-paper)] px-3 text-[12.5px] font-medium text-ink-3 transition-colors hover:bg-[var(--surface-2)] hover:text-ink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Actualizar
            </button>
          </div>
        }
      />

      <div className="relative overflow-hidden rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-elevated)]">
        <div
          aria-label="Secciones de tienda"
          className="flex items-center gap-1 overflow-x-auto border-b border-[color:var(--hairline)] bg-[var(--surface-1)] px-3 py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => handleTabChange(tab.value)}
                className={cn(
                  "relative inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 text-[12.5px] font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
                  active ? "text-ink-12" : "text-ink-3 hover:text-ink-0",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="store-tab-pill"
                    className="absolute inset-0 -z-0 rounded-full bg-ink-0"
                    transition={{ type: "spring", stiffness: 360, damping: 32 }}
                  />
                ) : null}
                <span className="relative z-10 inline-flex items-center gap-2">
                  {tab.icon}
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="min-h-[320px] bg-[var(--surface-0)]" role="tabpanel">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            {activeTab === "resumen" ? (
              <StoreSummaryView
                initialData={initialData ?? null}
                isLive={isLive}
                isMercadoPagoConnected={isMercadoPagoConnected}
                isOps={isOps}
                paymentsPlatformReady={mercadoPagoPlatformReadiness.ready}
                onNavigate={handleTabChange}
                onRefresh={refreshData}
                pushToast={pushToast}
                publicPath={publicPath}
              />
            ) : activeTab === "comunicacion" ? (
              <div className="px-5 py-6 sm:px-7 sm:py-8">
                {communicationSettings ? (
                  <CommunicationPage
                    initialSettings={communicationSettings}
                    embedded
                  />
                ) : (
                  <div className="rounded-[var(--r-md)] border border-dashed border-[color:var(--hairline)] bg-[var(--surface-1)] px-5 py-10 text-center">
                    <MessageSquare
                      className="mx-auto h-5 w-5 text-ink-5"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    <p className="mt-3 text-[14px] font-semibold text-ink-0">
                      No pudimos cargar la configuración de Comunicación
                    </p>
                    <p className="mt-1.5 text-[12.5px] leading-[1.5] text-ink-5">
                      Recargá la página para volver a intentar.
                    </p>
                    <button
                      type="button"
                      onClick={refreshData}
                      className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-4 text-[12.5px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-1)]"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Reintentar
                    </button>
                  </div>
                )}
              </div>
            ) : activeTab === "dominio" ? (
              <DomainSettingsView
                initialData={initialData ?? null}
                onRefresh={refreshData}
                pushToast={pushToast}
                storeId={initialData?.store.id ?? null}
              />
            ) : (
              <PaymentsHub
                storeId={initialData?.store.id ?? null}
                publicPath={publicPath}
                isOps={isOps}
                platformReadiness={mercadoPagoPlatformReadiness}
                connections={paymentConnections}
                pushToast={pushToast}
              />
            )}
          </motion.div>
        </div>
      </div>

      <ToastViewport onDismiss={dismissToast} toasts={toasts} />
    </div>
  );
}

function HeaderPill({
  icon,
  label,
  monospace = false,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  monospace?: boolean;
  tone: "neutral" | "success" | "warning";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium ring-1 ring-inset",
        tone === "success" &&
          "bg-[color:color-mix(in_srgb,var(--signal-success)_14%,transparent)] text-[color:var(--signal-success)] ring-[color:color-mix(in_srgb,var(--signal-success)_28%,transparent)]",
        tone === "warning" &&
          "bg-[color:color-mix(in_srgb,var(--signal-warning)_14%,transparent)] text-[color:var(--signal-warning)] ring-[color:color-mix(in_srgb,var(--signal-warning)_28%,transparent)]",
        tone === "neutral" &&
          "bg-[var(--surface-1)] text-ink-4 ring-[color:var(--hairline)]",
        monospace && "font-mono text-[10.5px]",
      )}
      title={label}
    >
      {icon}
      <span className={cn("truncate", monospace && "max-w-[200px]")}>{label}</span>
    </span>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed right-6 top-20 z-[60] flex w-full max-w-sm flex-col gap-3">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 24, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-4 shadow-[var(--shadow-overlay)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[13px] font-semibold text-ink-0">{toast.title}</p>
                <p className="mt-1 text-[12px] text-ink-5">{toast.description}</p>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                className="rounded-full p-1.5 text-ink-5 transition-colors hover:bg-[var(--surface-2)] hover:text-ink-0"
                onClick={() => onDismiss(toast.id)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
