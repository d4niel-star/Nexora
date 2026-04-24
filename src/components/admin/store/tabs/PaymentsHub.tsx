"use client";

// ─── PaymentsHub — admin/store · Pagos ───────────────────────────────────
// Single source of truth for the payments tab. Shows:
//   1. Hero card with the *primary* checkout provider (Mercado Pago) and
//      a status-aware CTA. The CTA copy + variant maps deterministically
//      to the persisted status (no more "connected + reconnect" mismatch).
//   2. Stats strip with 4 KPIs (providers connected, primary, last
//      validation, errors).
//   3. Provider grid with one card per registry provider, animated mount,
//      status pill, and per-card actions (connect / validate / disconnect).
//   4. Connect drawer for API-key based providers (MODO, Ualá Bis,
//      dLocal, PayU, Payway). Inline validation against the real API
//      where possible.
//
// All animations are framer-motion driven and intentionally subtle.

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  Info,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  PAYMENT_CAPABILITY_LABELS,
  PAYMENT_PROVIDER_ORDER,
  PAYMENT_PROVIDER_REGISTRY,
  type PaymentProviderId,
  type PaymentProviderMetadata,
} from "@/lib/payments/registry";
import {
  connectPaymentProviderAction,
  disconnectPaymentProviderAction,
  validatePaymentProviderAction,
} from "@/lib/payments/actions";
import type {
  PaymentProviderConnectionView,
  PaymentProviderStatus,
} from "@/lib/payments/types";
import type { MercadoPagoPlatformReadiness } from "@/lib/payments/mercadopago/platform-readiness";

import { MotionButton } from "../primitives/MotionButton";
import { StatusPill } from "../primitives/StatusPill";

const timeFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

interface PaymentsHubProps {
  storeId: string | null;
  publicPath: string;
  isOps: boolean;
  platformReadiness: MercadoPagoPlatformReadiness;
  /** Connections persisted in DB. Empty array if the store has none. */
  connections: PaymentProviderConnectionView[];
  /** Toast bridge so this surface uses the page-level viewport. */
  pushToast: (title: string, description: string) => void;
}

type LocalStatus = PaymentProviderStatus;

/**
 * Local, optimistic state per provider. We layer this on top of the
 * persisted state so transient phases (connecting, validating,
 * disconnecting) reflect in the UI instantly while the server action
 * runs. As soon as `router.refresh()` lands, the persisted state from
 * `connections` takes over again.
 */
type LocalStateMap = Partial<Record<string, LocalStatus>>;

export function PaymentsHub({
  publicPath,
  isOps,
  platformReadiness,
  connections,
  pushToast,
}: PaymentsHubProps) {
  const router = useRouter();
  const [localStatus, setLocalStatus] = useState<LocalStateMap>({});
  const [drawerProvider, setDrawerProvider] = useState<PaymentProviderId | null>(null);

  // Reset transient overrides whenever the persisted snapshot changes.
  useEffect(() => {
    setLocalStatus({});
  }, [connections]);

  const connectionsMap = useMemo(() => {
    const m = new Map<string, PaymentProviderConnectionView>();
    for (const c of connections) m.set(c.provider, c);
    return m;
  }, [connections]);

  function statusFor(id: PaymentProviderId): LocalStatus {
    const local = localStatus[id];
    if (local) return local;
    const persisted = connectionsMap.get(id);
    return (persisted?.status as LocalStatus | undefined) ?? "disconnected";
  }

  function setLocal(id: PaymentProviderId, status: LocalStatus | undefined) {
    setLocalStatus((prev) => ({ ...prev, [id]: status }));
  }

  // ─── KPI strip ────────────────────────────────────────────────────────
  const connectedCount = connections.filter((c) => c.status === "connected").length;
  const errorCount = connections.filter(
    (c) => c.status === "error" || c.status === "needs_reconnection",
  ).length;
  const primary = connectionsMap.get("mercadopago");
  const lastValidatedAt = connections
    .map((c) => c.lastValidatedAt)
    .filter((d): d is string => Boolean(d))
    .sort()
    .pop();

  // ─── Mercado Pago hero ────────────────────────────────────────────────
  const mpStatus = statusFor("mercadopago");
  const mpRow = connectionsMap.get("mercadopago") ?? null;
  const mpHero = buildMercadoPagoHero({
    status: mpStatus,
    row: mpRow,
    platformReady: platformReadiness.ready,
    isOps,
    publicPath,
  });

  return (
    <div className="space-y-6 p-6">
      {/* ─── Hero card · primary provider ─────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)]"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${PAYMENT_PROVIDER_REGISTRY.mercadopago.accent.from}, transparent)`,
          }}
        />
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-end">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <ProviderMark provider={PAYMENT_PROVIDER_REGISTRY.mercadopago} />
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-5">
                  Checkout principal
                </p>
                <h2 className="text-[19px] font-semibold leading-tight tracking-[-0.018em] text-ink-0">
                  {mpHero.title}
                </h2>
              </div>
              <StatusPill status={mpHero.status} className="ml-1" />
            </div>
            <p className="max-w-2xl text-[13px] leading-[1.55] text-ink-5">
              {mpHero.body}
            </p>
            {mpRow?.lastError ? (
              <div className="flex items-start gap-2 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[color:color-mix(in_srgb,var(--signal-danger)_8%,transparent)] px-3 py-2 text-[12px] leading-[1.45] text-[color:var(--signal-danger)]">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2.2} />
                <span className="break-words">{mpRow.lastError}</span>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 md:items-end">
            <MercadoPagoActions
              status={mpHero.status}
              hero={mpHero}
              onValidate={async () => {
                setLocal("mercadopago", "validating");
                const res = await validatePaymentProviderAction({ provider: "mercadopago" });
                pushToast(
                  res.ok ? "Mercado Pago validado" : "No se pudo validar",
                  res.message,
                );
                setLocal("mercadopago", undefined);
                router.refresh();
              }}
              onDisconnect={async () => {
                setLocal("mercadopago", "disconnecting");
                const res = await disconnectPaymentProviderAction({ provider: "mercadopago" });
                pushToast(
                  res.ok ? "Mercado Pago desconectado" : "No se pudo desconectar",
                  res.message,
                );
                setLocal("mercadopago", undefined);
                router.refresh();
              }}
              isOps={isOps}
              platformReady={platformReadiness.ready}
            />
            <span className="text-[11px] text-ink-6">
              {mpRow?.connectedAt
                ? `Conectado el ${timeFormatter.format(new Date(mpRow.connectedAt))}`
                : "Aún no conectado"}
            </span>
          </div>
        </div>
      </motion.section>

      {/* ─── KPI strip ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI
          label="Proveedores conectados"
          value={connectedCount.toString()}
          tone={connectedCount > 0 ? "success" : "muted"}
        />
        <KPI
          label="Principal"
          value={primary?.status === "connected" ? "Mercado Pago" : "Sin definir"}
          tone={primary?.status === "connected" ? "success" : "warning"}
        />
        <KPI
          label="Última validación"
          value={lastValidatedAt ? timeFormatter.format(new Date(lastValidatedAt)) : "Sin validar"}
          tone={lastValidatedAt ? "info" : "muted"}
        />
        <KPI
          label="Errores activos"
          value={errorCount.toString()}
          tone={errorCount > 0 ? "danger" : "success"}
        />
      </div>

      {/* ─── Provider grid ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <h3 className="text-[15px] font-semibold tracking-[-0.012em] text-ink-0">
              Proveedores disponibles
            </h3>
            <p className="mt-0.5 text-[12px] text-ink-5">
              Métodos de pago habilitados para Argentina (ARS) que Nexora puede integrar.
            </p>
          </div>
          <span className="hidden text-[11px] uppercase tracking-[0.12em] text-ink-6 md:inline">
            {PAYMENT_PROVIDER_ORDER.length} proveedores
          </span>
        </div>

        <motion.div
          className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
          }}
        >
          {PAYMENT_PROVIDER_ORDER.map((id) => {
            const meta = PAYMENT_PROVIDER_REGISTRY[id];
            const status = statusFor(id);
            const row = connectionsMap.get(id) ?? null;
            return (
              <ProviderCard
                key={id}
                metadata={meta}
                status={status}
                row={row}
                onOpenDrawer={() => setDrawerProvider(id)}
                onValidate={async () => {
                  setLocal(id, "validating");
                  const res = await validatePaymentProviderAction({ provider: id });
                  pushToast(
                    res.ok ? `${meta.label} validado` : `No se pudo validar ${meta.label}`,
                    res.message,
                  );
                  setLocal(id, undefined);
                  router.refresh();
                }}
                onDisconnect={async () => {
                  setLocal(id, "disconnecting");
                  const res = await disconnectPaymentProviderAction({ provider: id });
                  pushToast(
                    res.ok ? `${meta.label} desconectado` : `No se pudo desconectar`,
                    res.message,
                  );
                  setLocal(id, undefined);
                  router.refresh();
                }}
              />
            );
          })}
        </motion.div>
      </div>

      <p className="rounded-[var(--r-sm)] border border-dashed border-[color:var(--hairline)] bg-[var(--surface-1)] px-4 py-3 text-[12px] leading-[1.55] text-ink-5">
        <Info className="mr-1.5 -mt-0.5 inline-block h-3.5 w-3.5 text-ink-4" />
        Sólo Mercado Pago está cableado al checkout público hoy. Los demás
        proveedores quedan persistidos y validados, listos para activarse en
        la próxima fase de cobros multi-gateway.
      </p>

      {/* ─── Connect drawer ────────────────────────────────────────── */}
      <AnimatePresence>
        {drawerProvider ? (
          <ConnectDrawer
            metadata={PAYMENT_PROVIDER_REGISTRY[drawerProvider]}
            existingConfig={connectionsMap.get(drawerProvider)?.config ?? {}}
            onClose={() => setDrawerProvider(null)}
            onSubmit={async (creds) => {
              setLocal(drawerProvider, "connecting");
              const res = await connectPaymentProviderAction({
                provider: drawerProvider,
                credentials: creds,
              });
              pushToast(
                res.ok
                  ? `${PAYMENT_PROVIDER_REGISTRY[drawerProvider].label} conectado`
                  : `No se pudo conectar`,
                res.message,
              );
              setLocal(drawerProvider, undefined);
              if (res.ok) setDrawerProvider(null);
              router.refresh();
              return res;
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

// ─── Hero builder for Mercado Pago ─────────────────────────────────────
interface MpHero {
  status: PaymentProviderStatus;
  title: string;
  body: string;
}

function buildMercadoPagoHero(input: {
  status: PaymentProviderStatus;
  row: PaymentProviderConnectionView | null;
  platformReady: boolean;
  isOps: boolean;
  publicPath: string;
}): MpHero {
  const { status, row, platformReady, isOps } = input;

  if (!platformReady) {
    return {
      status: "error",
      title: "Mercado Pago no está listo a nivel plataforma",
      body: isOps
        ? "Falta cargar variables de la app MP en la infraestructura. Abrí la pantalla de configuración global para completarlo."
        : "El equipo operativo todavía no terminó la configuración global de Mercado Pago. Hasta entonces, ninguna tienda puede conectarse.",
    };
  }
  if (status === "needs_reconnection") {
    return {
      status: "needs_reconnection",
      title: "Reconexión requerida",
      body:
        "La sesión OAuth de Mercado Pago de esta tienda expiró o fue revocada. Reconectá la cuenta para volver a habilitar el checkout. Las órdenes existentes no se ven afectadas.",
    };
  }
  if (status === "error") {
    return {
      status: "error",
      title: "Mercado Pago con errores",
      body:
        row?.lastError ??
        "La última validación con Mercado Pago falló. Revisá la cuenta y reintentá la validación o reconectá si el problema persiste.",
    };
  }
  if (status === "connecting") {
    return {
      status: "connecting",
      title: "Conectando con Mercado Pago…",
      body: "Te estamos redirigiendo al flujo OAuth oficial.",
    };
  }
  if (status === "validating") {
    return {
      status: "validating",
      title: "Validando la sesión con Mercado Pago…",
      body: "Llamando a /users/me para confirmar que el access token sigue activo.",
    };
  }
  if (status === "disconnecting") {
    return {
      status: "disconnecting",
      title: "Desconectando Mercado Pago…",
      body: "Borrando las credenciales cifradas de esta tienda.",
    };
  }
  if (status === "connected") {
    const account = row?.accountEmail ?? row?.externalAccountId ?? "tu cuenta";
    return {
      status: "connected",
      title: "Checkout activo",
      body: `Las compras se cobran con ${account}. Nexora guarda el access token cifrado y el estado de pago se confirma vía webhook firmado de Mercado Pago.`,
    };
  }
  return {
    status: "disconnected",
    title: "Conectá Mercado Pago para empezar a cobrar",
    body: "Tu tienda puede publicarse sin pasarela, pero el checkout queda inactivo hasta que conectes una cuenta MP. La conexión es OAuth oficial y se puede revocar en cualquier momento.",
  };
}

function MercadoPagoActions({
  status,
  hero,
  onValidate,
  onDisconnect,
  isOps,
  platformReady,
}: {
  status: PaymentProviderStatus;
  hero: MpHero;
  onValidate: () => Promise<void>;
  onDisconnect: () => Promise<void>;
  isOps: boolean;
  platformReady: boolean;
}) {
  const [validating, startValidate] = useTransition();
  const [disconnecting, startDisconnect] = useTransition();

  if (!platformReady) {
    if (isOps) {
      return (
        <a
          href="/admin/settings/integrations/mercadopago"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--r-sm)] bg-ink-0 px-4 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2"
        >
          <CreditCard className="h-3.5 w-3.5" />
          Configurar plataforma
        </a>
      );
    }
    return (
      <span className="inline-flex h-10 items-center gap-2 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-4 text-[12px] font-medium text-ink-5">
        <Info className="h-3.5 w-3.5" />
        Pendiente del equipo operativo
      </span>
    );
  }

  if (status === "connected") {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <MotionButton
          variant="primary"
          loading={validating}
          onClick={() => startValidate(onValidate)}
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
        >
          {validating ? "Validando…" : "Validar conexión"}
        </MotionButton>
        <MotionButton
          variant="outline"
          loading={disconnecting}
          onClick={() => startDisconnect(onDisconnect)}
          leftIcon={<LogOut className="h-3.5 w-3.5" />}
        >
          {disconnecting ? "Desconectando…" : "Desconectar"}
        </MotionButton>
      </div>
    );
  }
  if (status === "needs_reconnection" || status === "error") {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <a
          href="/api/payments/mercadopago/oauth/start"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--r-sm)] bg-[color:var(--signal-warning)] px-4 text-[13px] font-medium text-ink-12 transition-[background-color,box-shadow] hover:brightness-105"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Reconectar Mercado Pago
        </a>
        <MotionButton
          variant="outline"
          loading={validating}
          onClick={() => startValidate(onValidate)}
          leftIcon={<ShieldCheck className="h-3.5 w-3.5" />}
        >
          {validating ? "Validando…" : "Reintentar validación"}
        </MotionButton>
      </div>
    );
  }
  if (status === "connecting" || status === "validating" || status === "disconnecting") {
    return (
      <span className="inline-flex h-10 items-center gap-2 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-4 text-[13px] font-medium text-ink-5">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {hero.title}
      </span>
    );
  }
  // disconnected
  return (
    <a
      href="/api/payments/mercadopago/oauth/start"
      className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--r-sm)] bg-ink-0 px-4 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2"
    >
      <CreditCard className="h-3.5 w-3.5" />
      Conectar Mercado Pago
    </a>
  );
}

// ─── KPI ────────────────────────────────────────────────────────────────
function KPI({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "warning" | "danger" | "info" | "muted";
}) {
  const ringClass = {
    success: "before:bg-[color:var(--signal-success)]",
    warning: "before:bg-[color:var(--signal-warning)]",
    danger: "before:bg-[color:var(--signal-danger)]",
    info: "before:bg-[color:var(--accent-500)]",
    muted: "before:bg-[color:var(--hairline-strong)]",
  }[tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "relative overflow-hidden rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-4",
        "before:absolute before:left-0 before:top-0 before:h-full before:w-[2px] before:content-['']",
        ringClass,
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-5">{label}</p>
      <p className="mt-1.5 truncate text-[16px] font-semibold tracking-[-0.012em] text-ink-0" title={value}>
        {value}
      </p>
    </motion.div>
  );
}

// ─── Provider card ──────────────────────────────────────────────────────
function ProviderCard({
  metadata,
  status,
  row,
  onOpenDrawer,
  onValidate,
  onDisconnect,
}: {
  metadata: PaymentProviderMetadata;
  status: PaymentProviderStatus;
  row: PaymentProviderConnectionView | null;
  onOpenDrawer: () => void;
  onValidate: () => Promise<void>;
  onDisconnect: () => Promise<void>;
}) {
  const [validating, startValidate] = useTransition();
  const [disconnecting, startDisconnect] = useTransition();
  const [showCaps, setShowCaps] = useState(false);

  const isConnected = status === "connected";
  const isMP = metadata.id === "mercadopago";

  return (
    <motion.article
      variants={{
        hidden: { opacity: 0, y: 8 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
      }}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className={cn(
        "group relative flex flex-col gap-3 overflow-hidden rounded-[var(--r-md)] border bg-[var(--surface-0)] p-4",
        isConnected
          ? "border-[color:color-mix(in_srgb,var(--signal-success)_30%,var(--hairline))]"
          : "border-[color:var(--hairline)]",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-60"
        style={{
          background: `linear-gradient(90deg, transparent, ${metadata.accent.from}, transparent)`,
        }}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <ProviderMark provider={metadata} />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold tracking-[-0.012em] text-ink-0">
              {metadata.label}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[12px] leading-[1.45] text-ink-5">
              {metadata.tagline}
            </p>
          </div>
        </div>
        <StatusPill status={status} size="sm" />
      </div>

      <dl className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-[var(--r-sm)] bg-[var(--surface-1)] px-2.5 py-1.5">
          <dt className="text-[9.5px] uppercase tracking-[0.12em] text-ink-5">Conexión</dt>
          <dd className="mt-0.5 font-medium text-ink-1">
            {metadata.connectionStyle === "oauth" ? "OAuth" : "API keys"}
          </dd>
        </div>
        <div className="rounded-[var(--r-sm)] bg-[var(--surface-1)] px-2.5 py-1.5">
          <dt className="text-[9.5px] uppercase tracking-[0.12em] text-ink-5">Checkout</dt>
          <dd
            className={cn(
              "mt-0.5 font-medium",
              metadata.checkoutWired ? "text-[color:var(--signal-success)]" : "text-ink-4",
            )}
          >
            {metadata.checkoutWired ? "Operativo" : "Listo (próxima fase)"}
          </dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={() => setShowCaps((v) => !v)}
        className="inline-flex items-center gap-1 self-start text-[11px] font-medium text-ink-2 hover:text-ink-0"
      >
        Capacidades
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform",
            showCaps ? "rotate-180" : "rotate-0",
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {showCaps ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="mt-1 flex flex-wrap gap-1">
              {metadata.capabilities.map((cap) => (
                <span
                  key={cap}
                  className="inline-flex items-center rounded-full border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 py-0.5 text-[10.5px] font-medium text-ink-3"
                >
                  {PAYMENT_CAPABILITY_LABELS[cap]}
                </span>
              ))}
            </div>
            <ul className="mt-2 space-y-1 text-[11.5px] leading-[1.5] text-ink-5">
              {metadata.capabilityNotes.map((note) => (
                <li key={note} className="flex items-start gap-1.5">
                  <CheckCircle2
                    className="mt-0.5 h-3 w-3 shrink-0 text-ink-4"
                    strokeWidth={2}
                  />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {row?.lastError ? (
        <p className="rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[color:color-mix(in_srgb,var(--signal-danger)_8%,transparent)] px-2.5 py-1.5 text-[11px] leading-[1.4] text-[color:var(--signal-danger)]">
          {row.lastError}
        </p>
      ) : null}

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <a
          href={metadata.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11.5px] font-medium text-ink-3 hover:text-ink-0"
        >
          <BookOpen className="h-3 w-3" /> Docs
          <ExternalLink className="h-2.5 w-2.5" />
        </a>

        {isMP ? null : isConnected ? (
          <div className="flex items-center gap-1.5">
            <MotionButton
              variant="outline"
              size="sm"
              loading={validating}
              onClick={() => startValidate(onValidate)}
              leftIcon={<ShieldCheck className="h-3 w-3" />}
            >
              Validar
            </MotionButton>
            <MotionButton
              variant="ghost"
              size="sm"
              loading={disconnecting}
              onClick={() => startDisconnect(onDisconnect)}
              leftIcon={<LogOut className="h-3 w-3" />}
            >
              Desconectar
            </MotionButton>
          </div>
        ) : (
          <MotionButton
            variant="primary"
            size="sm"
            onClick={onOpenDrawer}
            rightIcon={<ArrowUpRight className="h-3 w-3" />}
          >
            Conectar
          </MotionButton>
        )}
      </div>
    </motion.article>
  );
}

// ─── Provider visual mark ───────────────────────────────────────────────
function ProviderMark({ provider }: { provider: PaymentProviderMetadata }) {
  return (
    <div
      aria-hidden
      className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-[var(--r-sm)] text-[12px] font-semibold tracking-tight text-white shadow-[0_4px_14px_-8px_color-mix(in_srgb,_currentColor_60%,_transparent)]"
      style={{
        background: `linear-gradient(135deg, ${provider.accent.from}, ${provider.accent.to})`,
      }}
    >
      {initials(provider.label)}
    </div>
  );
}

function initials(label: string): string {
  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// ─── Connect drawer ────────────────────────────────────────────────────
function ConnectDrawer({
  metadata,
  existingConfig,
  onClose,
  onSubmit,
}: {
  metadata: PaymentProviderMetadata;
  existingConfig: Record<string, unknown>;
  onClose: () => void;
  onSubmit: (creds: Record<string, string>) => Promise<{ ok: boolean; message: string }>;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const f of metadata.credentialFields ?? []) {
      const existing = existingConfig[f.key];
      initial[f.key] = typeof existing === "string" ? existing : "";
    }
    return initial;
  });
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [submitting, startSubmit] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function setVal(k: string, v: string) {
    setValues((prev) => ({ ...prev, [k]: v }));
  }

  function reveal(k: string) {
    setRevealed((prev) => ({ ...prev, [k]: !prev[k] }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startSubmit(async () => {
      const res = await onSubmit(values);
      if (!res.ok) setError(res.message);
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[80] flex items-stretch justify-end bg-[color:color-mix(in_srgb,var(--ink-0)_28%,transparent)] backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.aside
        initial={{ x: 32, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 32, opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="flex h-full w-full max-w-md flex-col overflow-hidden border-l border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-overlay)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Conectar ${metadata.label}`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-[color:var(--hairline)] px-5 py-4">
          <div className="flex items-start gap-3">
            <ProviderMark provider={metadata} />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-5">
                Conectar proveedor
              </p>
              <h3 className="mt-0.5 text-[16px] font-semibold tracking-[-0.012em] text-ink-0">
                {metadata.label}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--r-sm)] p-1.5 text-ink-5 transition-colors hover:bg-[var(--surface-2)] hover:text-ink-0"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <p className="text-[12.5px] leading-[1.55] text-ink-5">{metadata.description}</p>

          {metadata.requiresContractualOnboarding ? (
            <div className="flex items-start gap-2 rounded-[var(--r-sm)] border border-[color:color-mix(in_srgb,var(--signal-warning)_28%,var(--hairline))] bg-[color:color-mix(in_srgb,var(--signal-warning)_8%,transparent)] px-3 py-2 text-[11.5px] leading-[1.45] text-ink-2">
              <AlertTriangle
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--signal-warning)]"
                strokeWidth={2.2}
              />
              <span>
                {metadata.label} requiere alta comercial contractual. Las
                credenciales se persisten cifradas y validamos contra la API
                cuando es posible.
              </span>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-3">
            {(metadata.credentialFields ?? []).map((field) => {
              const isSecret = field.secret;
              const isRevealed = !!revealed[field.key];
              return (
                <div key={field.key} className="space-y-1">
                  <label className="block text-[11.5px] font-medium text-ink-1" htmlFor={`pp-${field.key}`}>
                    {field.label}
                  </label>
                  <div className="relative">
                    <input
                      id={`pp-${field.key}`}
                      type={isSecret && !isRevealed ? "password" : "text"}
                      value={values[field.key] ?? ""}
                      onChange={(e) => setVal(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      autoComplete="off"
                      spellCheck={false}
                      className={cn(
                        "h-10 w-full rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-3 text-[13px] font-medium text-ink-0",
                        "outline-none transition-[box-shadow,border-color] placeholder:text-ink-6",
                        "focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)]",
                        isSecret && "pr-10",
                      )}
                    />
                    {isSecret ? (
                      <button
                        type="button"
                        onClick={() => reveal(field.key)}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-[var(--r-sm)] p-1.5 text-ink-5 transition-colors hover:bg-[var(--surface-2)] hover:text-ink-0"
                        aria-label={isRevealed ? "Ocultar" : "Mostrar"}
                      >
                        {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    ) : null}
                  </div>
                  <p className="text-[11px] leading-[1.45] text-ink-5">{field.description}</p>
                  {field.exampleHint ? (
                    <p className="text-[10.5px] font-mono text-ink-6">{field.exampleHint}</p>
                  ) : null}
                </div>
              );
            })}

            {error ? (
              <p className="rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[color:color-mix(in_srgb,var(--signal-danger)_8%,transparent)] px-3 py-2 text-[12px] text-[color:var(--signal-danger)]">
                {error}
              </p>
            ) : null}

            <div className="flex items-center justify-end gap-2 pt-2">
              <MotionButton variant="ghost" size="md" type="button" onClick={onClose}>
                Cancelar
              </MotionButton>
              <MotionButton
                variant="primary"
                size="md"
                type="submit"
                loading={submitting}
                leftIcon={<ShieldCheck className="h-3.5 w-3.5" />}
              >
                {submitting ? "Validando…" : "Conectar y validar"}
              </MotionButton>
            </div>
          </form>

          <a
            href={metadata.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-ink-2 hover:text-ink-0"
          >
            <BookOpen className="h-3 w-3" />
            Documentación oficial
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </motion.aside>
    </motion.div>
  );
}
