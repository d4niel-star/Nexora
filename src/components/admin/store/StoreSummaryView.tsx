"use client";

import { useMemo, useRef, useTransition } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CreditCard,
  Eye,
  Globe,
  Package,
  Pencil,
  Save,
  ShieldCheck,
  Sparkles,
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

const timeFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

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

    // Checklist items — keep only the most important ones
    type CheckItem = {
      id: string;
      label: string;
      detail: string;
      done: boolean;
      tone: Tone;
      actionLabel?: string;
      href?: string;
      onClick?: () => void;
    };

    const checks: CheckItem[] = [
      {
        id: "catalog",
        label: "Catálogo vendible",
        detail: sellableProducts > 0
          ? `${sellableProducts} producto${sellableProducts === 1 ? "" : "s"} listo${sellableProducts === 1 ? "" : "s"}`
          : "Sin productos vendibles",
        done: sellableProducts > 0,
        tone: sellableProducts > 0 ? "success" : "danger",
        actionLabel: productCount === 0 ? "Crear SKU" : "Catálogo",
        onClick: productCount === 0
          ? () => firstProductRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
          : undefined,
        href: productCount === 0 ? undefined : "/admin/catalog",
      },
      {
        id: "payments",
        label: "Cobro operativo",
        detail: !paymentsPlatformReady
          ? "Bloqueado por plataforma"
          : isMercadoPagoConnected
            ? "Mercado Pago conectado"
            : "Pendiente de conexión",
        done: paymentsPlatformReady && isMercadoPagoConnected,
        tone: !paymentsPlatformReady ? "danger" : isMercadoPagoConnected ? "success" : "warning",
        actionLabel: "Pagos",
        onClick: () => onNavigate("pagos"),
      },
      {
        id: "shipping",
        label: "Envíos",
        detail: hasShippingConfigured
          ? `${activeShippingMethods} método${activeShippingMethods === 1 ? "" : "s"} activo${activeShippingMethods === 1 ? "" : "s"}`
          : "Sin configurar",
        done: hasShippingConfigured,
        tone: hasShippingConfigured ? "success" : "warning",
        actionLabel: "Envíos",
        href: "/admin/shipping",
      },
      {
        id: "domain",
        label: "Dominio",
        detail: usingInternalDomain ? "Subdominio interno" : primaryDomain,
        done: !usingInternalDomain && !domainAttention,
        tone: domainAttention ? (domainAttention.status === "failed" ? "danger" : "warning") : usingInternalDomain ? "warning" : "success",
        actionLabel: "Dominio",
        onClick: () => onNavigate("dominio"),
      },
      {
        id: "legal",
        label: "Legales",
        detail: legalReady ? "Completos" : "Incompletos",
        done: legalReady,
        tone: legalReady ? "success" : "warning",
        actionLabel: "Legales",
        href: "/admin/settings/legal",
      },
    ];

    const doneCount = checks.filter((c) => c.done).length;
    const progress = Math.round((doneCount / checks.length) * 100);

    return {
      productCount,
      publishedProducts,
      sellableProducts,
      primaryDomain,
      usingInternalDomain,
      hasUnpublishedChanges,
      lastPublishedAt,
      checkoutReady,
      checks,
      doneCount,
      progress,
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
        pushToast("Publicación actualizada", "La tienda quedó publicada correctamente.");
        onRefresh();
      } catch (error) {
        pushToast(
          "No se pudo publicar",
          error instanceof Error ? error.message : "Ocurrió un error al publicar la tienda.",
        );
      }
    });
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(model.publicStoreUrl);
      pushToast("Link copiado", "La URL pública de la tienda ya está en el portapapeles.");
    } catch {
      pushToast("No se pudo copiar", "Intenta nuevamente desde un navegador con permisos.");
    }
  };

  if (!initialData) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="text-[14px] font-semibold text-ink-0">No encontramos datos de la tienda</p>
        <p className="mt-1.5 text-[12.5px] text-ink-5">
          La superficie operativa necesita una tienda cargada.
        </p>
      </div>
    );
  }

  const showPublishButton = !isLive || model.hasUnpublishedChanges;
  const primaryActionDisabled = model.sellableProducts === 0 || isPublishing;

  return (
    <div className="space-y-0">
      {/* ── Hero header ─────────────────────────────────── */}
      <div className="flex flex-col gap-4 border-b border-[color:var(--hairline)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-block h-2 w-2 rounded-full",
                  isLive ? "bg-[color:var(--signal-success)]" : "bg-ink-6",
                )}
              />
              <p className="text-[13px] font-semibold text-ink-0">
                {isLive ? "Tienda en vivo" : "En borrador"}
              </p>
            </div>
            {model.lastPublishedAt ? (
              <span className="text-[11px] text-ink-5">
                Última publicación: {model.lastPublishedAt}
              </span>
            ) : null}
          </div>
          <p className="mt-1 truncate font-mono text-[12px] text-ink-5">{model.primaryDomain}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {showPublishButton ? (
            <button
              type="button"
              onClick={handlePublish}
              disabled={primaryActionDisabled}
              className="inline-flex h-9 items-center gap-2 rounded-full bg-ink-0 px-4 text-[12.5px] font-medium text-ink-12 transition-colors hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Eye className="h-3.5 w-3.5" />
              {isPublishing
                ? "Publicando..."
                : isLive
                  ? "Publicar cambios"
                  : "Publicar tienda"}
            </button>
          ) : null}

          <a
            href={model.publicStoreUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-2 rounded-full border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-4 text-[12.5px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-1)]"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            Ver tienda
          </a>

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-3 text-[12.5px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-1)]"
          >
            Copiar link
          </button>
        </div>
      </div>

      {/* ── KPIs ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 divide-x divide-[color:var(--hairline)] border-b border-[color:var(--hairline)] sm:grid-cols-4">
        <KpiCell label="Productos vendibles" value={model.sellableProducts.toString()} />
        <KpiCell label="Publicados" value={model.publishedProducts.toString()} />
        <KpiCell
          label="Progreso"
          value={`${model.doneCount}/${model.checks.length}`}
          detail={`${model.progress}%`}
        />
        <KpiCell
          label="Estado"
          value={isLive ? "En vivo" : model.sellableProducts > 0 ? "Lista" : "Preparando"}
          tone={isLive ? "success" : model.sellableProducts > 0 ? "warning" : "neutral"}
        />
      </div>

      {/* ── First product CTA (only when 0 products) ──── */}
      {model.productCount === 0 ? (
        <div ref={firstProductRef}>
          <FirstProductPanel onRefresh={onRefresh} pushToast={pushToast} />
        </div>
      ) : null}

      {/* ── Checklist ───────────────────────────────────── */}
      <div className="divide-y divide-[color:var(--hairline)]">
        {model.checks.map((check) => (
          <CheckRow key={check.id} check={check} />
        ))}
      </div>

      {/* ── Quick links ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-px border-t border-[color:var(--hairline)] bg-[var(--hairline)] sm:grid-cols-3">
        <QuickLink icon={<Package className="h-4 w-4" />} label="Catálogo" href="/admin/catalog" />
        <QuickLink icon={<CreditCard className="h-4 w-4" />} label="Pagos" onClick={() => onNavigate("pagos")} />
        <QuickLink icon={<Globe className="h-4 w-4" />} label="Dominio" onClick={() => onNavigate("dominio")} />
        <QuickLink icon={<Truck className="h-4 w-4" />} label="Envíos" href="/admin/shipping" />
        <QuickLink icon={<ShieldCheck className="h-4 w-4" />} label="Legales" href="/admin/settings/legal" />
        <QuickLink icon={<Sparkles className="h-4 w-4" />} label="Tienda IA" href="/admin/store-ai" />
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────

function KpiCell({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: Tone;
}) {
  return (
    <div className="px-5 py-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-5">{label}</p>
      <div className="mt-1.5 flex items-baseline gap-2">
        <p className="text-[18px] font-semibold tracking-[-0.02em] text-ink-0">{value}</p>
        {detail ? <span className="text-[11px] text-ink-5">{detail}</span> : null}
        {tone ? (
          <span
            className={cn(
              "inline-block h-1.5 w-1.5 rounded-full",
              tone === "success" && "bg-[color:var(--signal-success)]",
              tone === "warning" && "bg-[color:var(--signal-warning)]",
              tone === "danger" && "bg-[color:var(--signal-danger)]",
              tone === "neutral" && "bg-ink-6",
            )}
          />
        ) : null}
      </div>
    </div>
  );
}

function CheckRow({
  check,
}: {
  check: {
    id: string;
    label: string;
    detail: string;
    done: boolean;
    tone: Tone;
    actionLabel?: string;
    href?: string;
    onClick?: () => void;
  };
}) {
  const action = check.actionLabel ? (
    check.href ? (
      <Link href={check.href} className="text-[12px] font-medium text-ink-3 transition-colors hover:text-ink-0">
        {check.actionLabel}
        <ArrowRight className="ml-1 inline h-3 w-3" />
      </Link>
    ) : check.onClick ? (
      <button type="button" onClick={check.onClick} className="text-[12px] font-medium text-ink-3 transition-colors hover:text-ink-0">
        {check.actionLabel}
        <ArrowRight className="ml-1 inline h-3 w-3" />
      </button>
    ) : null
  ) : null;

  return (
    <div className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
          check.done
            ? "text-[color:var(--signal-success)]"
            : check.tone === "danger"
              ? "text-[color:var(--signal-danger)]"
              : "text-ink-5",
        )}
      >
        {check.done ? (
          <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
        ) : (
          <div className="h-3.5 w-3.5 rounded-full border-2 border-current" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-medium text-ink-0">{check.label}</p>
          <TonePill tone={check.tone} />
        </div>
        <p className="text-[12px] text-ink-5">{check.detail}</p>
      </div>
      {action}
    </div>
  );
}

function QuickLink({
  icon,
  label,
  href,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  const className =
    "flex items-center gap-2.5 bg-[var(--surface-0)] px-5 py-3.5 text-[12.5px] font-medium text-ink-2 transition-colors hover:bg-[var(--surface-1)] hover:text-ink-0";

  if (href) {
    return (
      <Link href={href} className={className}>
        {icon}
        {label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {icon}
      {label}
    </button>
  );
}

function TonePill({ tone }: { tone: Tone }) {
  const label =
    tone === "success" ? "OK" : tone === "warning" ? "Pendiente" : tone === "danger" ? "Requiere acción" : "";
  if (!label) return null;

  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em]",
        tone === "success" &&
          "bg-[color:color-mix(in_srgb,var(--signal-success)_12%,transparent)] text-[color:var(--signal-success)]",
        tone === "warning" &&
          "bg-[color:color-mix(in_srgb,var(--signal-warning)_12%,transparent)] text-[color:var(--signal-warning)]",
        tone === "danger" &&
          "bg-[color:color-mix(in_srgb,var(--signal-danger)_12%,transparent)] text-[color:var(--signal-danger)]",
      )}
    >
      {label}
    </span>
  );
}

// ─── First product panel ─────────────────────────────────────────────────

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
        pushToast("Producto creado", "Ya tenés un primer SKU con variante, precio y stock.");
        onRefresh();
      } catch (error) {
        pushToast(
          "No se pudo crear",
          error instanceof Error ? error.message : "Ocurrió un error al crear el producto.",
        );
      }
    });
  };

  const inputClass =
    "h-10 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-3 text-[13px] text-ink-0 outline-none transition-[box-shadow,border-color] placeholder:text-ink-6 focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)]";

  return (
    <form
      onSubmit={handleSubmit}
      className="border-b border-[color:var(--hairline)] bg-[color:color-mix(in_srgb,var(--signal-warning)_4%,var(--surface-0))] px-5 py-5 sm:px-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold text-ink-0">Cargá el primer producto</p>
          <p className="mt-0.5 text-[12px] text-ink-5">
            Sin un SKU vendible la tienda no puede salir en vivo.
          </p>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-ink-0 px-4 text-[12.5px] font-medium text-ink-12 transition-colors hover:bg-ink-2 disabled:opacity-40"
        >
          <Save className="h-3.5 w-3.5" />
          {isPending ? "Creando..." : "Crear"}
        </button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <input className={inputClass} name="title" placeholder="Nombre" required />
        <input className={inputClass} name="variantTitle" placeholder="Variante" />
        <input className={inputClass} min="1" name="price" placeholder="Precio" required step="0.01" type="number" />
        <input className={inputClass} min="0" name="stock" placeholder="Stock" required step="1" type="number" />
      </div>
    </form>
  );
}
