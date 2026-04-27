"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  Info,
  KeyRound,
  Link2,
  Loader2,
  PlugZap,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Unplug,
} from "lucide-react";

import { MotionButton } from "@/components/admin/store/primitives/MotionButton";
import { syncAdsInsights } from "@/lib/ads/sync/actions";
import { removeAdsConnection } from "@/lib/ads/connections/actions";
import { generateAdsCopilotRecommendations } from "@/lib/ads/ai/actions";
import { createCampaignDraft } from "@/lib/ads/drafts/actions";
import type { AdsProviderMeta } from "@/lib/ads/registry";
import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";

// ─── Per-provider Ads Hub ───────────────────────────────────────────────
//
// One self-contained surface per advertising network (Meta / TikTok /
// Google). All three providers share this component to avoid the kind
// of triplicated copy-paste UI that plagued the old single-page Ads
// Copilot. The differences live in:
//
//   · `provider`  → metadata pulled from `lib/ads/registry`
//   · `connection` → the persisted AdPlatformConnection row (or null)
//   · The three lists below (recommendations / drafts / insights), already
//     filtered by the parent server component to this provider.
//
// What is NOT here on purpose:
//   · No "switch tabs to see the other provider" — providers are now
//     full-fledged sidebar surfaces, so a tab strip would lie about IA.
//   · No pixel/tag editor — that lives in /admin/ads/pixels and is
//     reachable from the "Configurar píxel" CTA in the integration card.

type ConnectionRow = {
  id: string;
  status: string;
  externalAccountId: string | null;
  accountName: string | null;
  lastValidatedAt: Date | string | null;
  lastError: string | null;
};

type RecommendationRow = {
  id: string;
  platform: string;
  type: string;
  priority: string;
  title: string;
  summary: string;
  recommendationJson: string;
};

type DraftRow = {
  id: string;
  platform: string;
  status: string;
  budgetDaily: number | null;
  copyJson: string | null;
  aiSummary: string | null;
};

type InsightRow = {
  id: string;
  platform: string;
  metricsJson: string;
  snapshotAt: Date | string;
};

interface ProviderHubProps {
  storeId: string;
  provider: AdsProviderMeta;
  connection: ConnectionRow | null;
  recommendations: RecommendationRow[];
  drafts: DraftRow[];
  insights: InsightRow[];
  pixelFieldsConfigured: number;
  pixelFieldsTotal: number;
  envReady: boolean;
  searchParams?: { [key: string]: string | string[] | undefined };
}

const STATUS_TONE: Record<string, string> = {
  connected:
    "text-[color:var(--signal-success)] bg-[color:color-mix(in_srgb,var(--signal-success)_14%,transparent)] ring-[color:color-mix(in_srgb,var(--signal-success)_30%,transparent)]",
  pending:
    "text-[color:var(--signal-warning)] bg-[color:color-mix(in_srgb,var(--signal-warning)_14%,transparent)] ring-[color:color-mix(in_srgb,var(--signal-warning)_28%,transparent)]",
  error:
    "text-[color:var(--signal-danger)] bg-[color:color-mix(in_srgb,var(--signal-danger)_14%,transparent)] ring-[color:color-mix(in_srgb,var(--signal-danger)_28%,transparent)]",
  disconnected:
    "text-ink-5 bg-[var(--surface-2)] ring-[color:var(--hairline)]",
};

const STATUS_LABEL: Record<string, string> = {
  connected: "Conectado",
  pending: "Pendiente",
  error: "Error",
  disconnected: "Sin conectar",
};

function statusTone(status: string | undefined | null): string {
  if (!status) return STATUS_TONE.disconnected;
  return STATUS_TONE[status] ?? STATUS_TONE.disconnected;
}

function statusLabel(status: string | undefined | null): string {
  if (!status) return STATUS_LABEL.disconnected;
  return STATUS_LABEL[status] ?? status;
}

function formatDateTime(value: Date | string | null): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrencyARS(n: number): string {
  return n.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
}

export function ProviderHub({
  storeId,
  provider,
  connection,
  recommendations,
  drafts,
  insights,
  pixelFieldsConfigured,
  pixelFieldsTotal,
  envReady,
  searchParams,
}: ProviderHubProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<null | "connect" | "sync" | "disconnect" | "analyze" | string>(null);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const oauthFlash = useMemo(() => {
    if (!searchParams) return null;
    const error = typeof searchParams.error === "string" ? searchParams.error : null;
    const detail = typeof searchParams.detail === "string" ? searchParams.detail : null;
    const connected = typeof searchParams.connected === "string" ? searchParams.connected : null;
    if (error) {
      const map: Record<string, string> = {
        missing_params: "Flujo cancelado o inválido.",
        auth_denied: "El usuario denegó los permisos.",
        provider_error: "El proveedor rechazó la autorización.",
        callback_failed: "Falló el callback de OAuth.",
        config_error: "Faltan credenciales de la app para iniciar OAuth.",
        no_store: "No se pudo identificar la tienda.",
      };
      const human = map[error] ?? "Hubo un error al intentar conectar la cuenta.";
      const dec = (() => {
        if (!detail) return null;
        try {
          return decodeURIComponent(detail);
        } catch {
          return detail;
        }
      })();
      return { tone: "err" as const, text: dec ? `${human} ${dec}` : human };
    }
    if (connected === provider.id) {
      return { tone: "ok" as const, text: `Cuenta de ${provider.label} vinculada correctamente.` };
    }
    return null;
  }, [searchParams, provider.id, provider.label]);

  const isConnected = connection?.status === "connected";

  const handleConnect = () => {
    setBusy("connect");
    setFeedback(null);
    window.location.href = `/api/ads/oauth/${provider.id}/start`;
  };

  const handleSync = async () => {
    if (!connection) return;
    setBusy("sync");
    setFeedback(null);
    try {
      await syncAdsInsights(connection.id);
      startTransition(() => router.refresh());
      setFeedback({ tone: "ok", text: "Métricas sincronizadas." });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al sincronizar.";
      setFeedback({ tone: "err", text: msg });
    } finally {
      setBusy(null);
    }
  };

  const handleDisconnect = async () => {
    if (!connection) return;
    if (!window.confirm(`¿Desconectar la cuenta de ${provider.label}? Los borradores e insights ya guardados se conservan.`)) {
      return;
    }
    setBusy("disconnect");
    setFeedback(null);
    try {
      await removeAdsConnection(connection.id, storeId);
      startTransition(() => router.refresh());
      setFeedback({ tone: "ok", text: "Cuenta desconectada." });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "No se pudo desconectar.";
      setFeedback({ tone: "err", text: msg });
    } finally {
      setBusy(null);
    }
  };

  const handleAnalyze = async () => {
    setBusy("analyze");
    setFeedback(null);
    try {
      await generateAdsCopilotRecommendations(storeId);
      startTransition(() => router.refresh());
      setFeedback({ tone: "ok", text: "Recomendaciones regeneradas." });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Análisis fallido.";
      setFeedback({ tone: "err", text: msg });
    } finally {
      setBusy(null);
    }
  };

  const handleCreateDraft = async (recoId: string) => {
    setBusy(`draft-${recoId}`);
    setFeedback(null);
    try {
      await createCampaignDraft(storeId, recoId);
      startTransition(() => router.refresh());
      setFeedback({ tone: "ok", text: "Borrador creado localmente." });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "No se pudo crear el borrador.";
      setFeedback({ tone: "err", text: msg });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-7">
      <AdminPageHeader
        eyebrow={`Marketing · ${provider.label}`}
        title={provider.label}
        subtitle={provider.tagline}
        actions={
          <div className="flex items-center gap-2">
            <a
              href={provider.docsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[color:var(--hairline-strong)] bg-[var(--surface-paper)] px-4 text-[12.5px] font-medium text-ink-1 transition-colors hover:bg-[var(--surface-2)]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Docs oficiales
            </a>
            <Link
              href="/admin/ads/pixels"
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[color:var(--hairline-strong)] bg-[var(--surface-paper)] px-4 text-[12.5px] font-medium text-ink-1 transition-colors hover:bg-[var(--surface-2)]"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Píxeles y tags
            </Link>
          </div>
        }
      />

      {/* OAuth flash */}
      <AnimatePresence>
        {oauthFlash && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className={`rounded-[var(--r-md)] border p-4 text-[13px] flex items-start gap-3 ${
              oauthFlash.tone === "err"
                ? "border-[color:color-mix(in_srgb,var(--signal-danger)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--signal-danger)_8%,transparent)] text-[color:var(--signal-danger)]"
                : "border-[color:color-mix(in_srgb,var(--signal-success)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--signal-success)_8%,transparent)] text-[color:var(--signal-success)]"
            }`}
          >
            {oauthFlash.tone === "err" ? (
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
            )}
            <span>{oauthFlash.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inline action feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className={`rounded-[var(--r-md)] border p-3 text-[12.5px] flex items-start gap-2 ${
              feedback.tone === "err"
                ? "border-[color:color-mix(in_srgb,var(--signal-danger)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--signal-danger)_8%,transparent)] text-[color:var(--signal-danger)]"
                : "border-[color:color-mix(in_srgb,var(--signal-success)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--signal-success)_8%,transparent)] text-[color:var(--signal-success)]"
            }`}
          >
            {feedback.tone === "err" ? (
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connection card */}
        <section className="lg:col-span-2 rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6 sm:p-7 shadow-[var(--shadow-soft)]">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
            <div className="space-y-3 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 h-6 text-[11px] font-medium ring-1 ring-inset ${statusTone(
                    connection?.status,
                  )}`}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor: isConnected ? "currentColor" : "currentColor",
                    }}
                  />
                  {statusLabel(connection?.status)}
                </span>
                {!envReady && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 h-6 text-[10.5px] font-medium bg-[var(--surface-2)] text-ink-5 ring-1 ring-inset ring-[color:var(--hairline)]">
                    <Info className="h-3 w-3" />
                    Credenciales de app no configuradas
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-ink-6">
                  Cuenta vinculada
                </p>
                <p className="text-[18px] font-semibold text-ink-0 truncate">
                  {connection?.accountName ?? "Sin cuenta"}
                </p>
                {connection?.externalAccountId && (
                  <p className="text-[12px] text-ink-5 font-mono">
                    ID: {connection.externalAccountId}
                  </p>
                )}
              </div>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12px] pt-2">
                <div>
                  <dt className="text-ink-6 uppercase tracking-[0.08em] text-[10.5px] mb-0.5">
                    Última validación
                  </dt>
                  <dd className="text-ink-2 font-medium">
                    {formatDateTime(connection?.lastValidatedAt ?? null)}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-6 uppercase tracking-[0.08em] text-[10.5px] mb-0.5">
                    Píxeles / tags
                  </dt>
                  <dd className="text-ink-2 font-medium">
                    {pixelFieldsConfigured} / {pixelFieldsTotal} configurados
                  </dd>
                </div>
              </dl>
              {connection?.lastError && (
                <div className="rounded-[var(--r-sm)] border border-[color:color-mix(in_srgb,var(--signal-danger)_25%,transparent)] bg-[color:color-mix(in_srgb,var(--signal-danger)_6%,transparent)] p-3 text-[12px] text-[color:var(--signal-danger)] flex gap-2 items-start">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span className="break-words">{connection.lastError}</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:w-44 shrink-0">
              {!isConnected ? (
                <MotionButton
                  variant="primary"
                  size="md"
                  loading={busy === "connect"}
                  onClick={handleConnect}
                  leftIcon={<PlugZap />}
                  fullWidth
                >
                  Conectar cuenta
                </MotionButton>
              ) : (
                <>
                  <MotionButton
                    variant="primary"
                    size="md"
                    loading={busy === "sync"}
                    onClick={handleSync}
                    leftIcon={<RefreshCw />}
                    fullWidth
                  >
                    Sincronizar
                  </MotionButton>
                  <MotionButton
                    variant="outline"
                    size="md"
                    loading={busy === "disconnect"}
                    onClick={handleDisconnect}
                    leftIcon={<Unplug />}
                    fullWidth
                  >
                    Desconectar
                  </MotionButton>
                </>
              )}
              <Link
                href="/admin/ads/pixels"
                className="inline-flex items-center justify-center gap-1.5 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-3 h-10 text-[13px] font-medium text-ink-2 hover:bg-[var(--surface-2)] transition-colors"
              >
                <KeyRound className="h-3.5 w-3.5" />
                Configurar píxel
              </Link>
            </div>
          </div>

          {/* Scope chips */}
          <div className="mt-6 flex flex-wrap items-center gap-1.5">
            <span className="text-[10.5px] uppercase tracking-[0.08em] text-ink-6 mr-1">Permisos OAuth</span>
            {provider.oauthScopes.map((scope) => (
              <span
                key={scope}
                className="inline-flex items-center rounded-[var(--r-xs)] bg-[var(--surface-2)] px-2 h-5 text-[10.5px] font-mono text-ink-3 ring-1 ring-inset ring-[color:var(--hairline)]"
              >
                {scope}
              </span>
            ))}
          </div>
        </section>

        {/* Sync KPIs */}
        <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6 shadow-[var(--shadow-soft)] flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-ink-3" />
            <h2 className="text-[14px] font-semibold text-ink-0">Métricas sincronizadas</h2>
          </div>
          <InsightsSummary insights={insights} />
        </section>
      </div>

      {/* Recommendations */}
      <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-soft)] overflow-hidden">
        <div className="flex items-center justify-between gap-4 p-5 border-b border-[color:var(--hairline)]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-ink-3" />
            <h2 className="text-[14px] font-semibold text-ink-0">
              Recomendaciones para {provider.label}
            </h2>
            {recommendations.length > 0 && (
              <span className="inline-flex items-center rounded-[var(--r-xs)] bg-[var(--surface-2)] px-2 h-5 text-[10.5px] font-medium text-ink-3 ring-1 ring-inset ring-[color:var(--hairline)]">
                {recommendations.length}
              </span>
            )}
          </div>
          <MotionButton
            variant="outline"
            size="sm"
            loading={busy === "analyze" || pending}
            onClick={handleAnalyze}
            leftIcon={<Sparkles />}
          >
            Analizar negocio
          </MotionButton>
        </div>
        {recommendations.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-[13px] text-ink-5">
              Sin recomendaciones activas para {provider.label}. Hacé clic en analizar para generar
              propuestas basadas en tus productos y ventas reales.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[color:var(--hairline)]">
            {recommendations.map((r) => {
              const payload = (() => {
                try {
                  return JSON.parse(r.recommendationJson) as Record<string, unknown>;
                } catch {
                  return {};
                }
              })();
              return (
                <li key={r.id} className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-start gap-5">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center rounded-[var(--r-xs)] bg-[var(--surface-2)] px-2 h-5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3 ring-1 ring-inset ring-[color:var(--hairline)]">
                        {r.type.replaceAll("_", " ")}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-[var(--r-xs)] px-2 h-5 text-[10.5px] font-semibold uppercase tracking-[0.08em] ring-1 ring-inset ${
                          r.priority === "high"
                            ? "bg-[color:color-mix(in_srgb,var(--signal-warning)_14%,transparent)] text-[color:var(--signal-warning)] ring-[color:color-mix(in_srgb,var(--signal-warning)_28%,transparent)]"
                            : "bg-[var(--surface-2)] text-ink-4 ring-[color:var(--hairline)]"
                        }`}
                      >
                        {r.priority}
                      </span>
                    </div>
                    <h3 className="text-[15px] font-semibold text-ink-0 tracking-[-0.01em]">{r.title}</h3>
                    <p className="text-[13px] text-ink-4 leading-[1.55]">{r.summary}</p>
                    {Boolean(payload.audience || payload.hook) && (
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px]">
                        {payload.audience ? (
                          <div className="rounded-[var(--r-sm)] bg-[var(--surface-1)] border border-[color:var(--hairline)] p-3">
                            <p className="text-[10.5px] uppercase tracking-[0.08em] text-ink-6 mb-1">
                              Audiencia
                            </p>
                            <p className="text-ink-1">{String(payload.audience)}</p>
                          </div>
                        ) : null}
                        {payload.hook ? (
                          <div className="rounded-[var(--r-sm)] bg-[var(--surface-1)] border border-[color:var(--hairline)] p-3">
                            <p className="text-[10.5px] uppercase tracking-[0.08em] text-ink-6 mb-1">
                              Hook
                            </p>
                            <p className="text-ink-1 italic">"{String(payload.hook)}"</p>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 sm:w-44">
                    <MotionButton
                      variant="primary"
                      size="md"
                      loading={busy === `draft-${r.id}`}
                      onClick={() => handleCreateDraft(r.id)}
                      leftIcon={<ArrowUpRight />}
                      fullWidth
                    >
                      Crear borrador
                    </MotionButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Drafts + insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-soft)] overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-[color:var(--hairline)]">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-ink-3" />
              <h2 className="text-[14px] font-semibold text-ink-0">Borradores locales</h2>
              {drafts.length > 0 && (
                <span className="inline-flex items-center rounded-[var(--r-xs)] bg-[var(--surface-2)] px-2 h-5 text-[10.5px] font-medium text-ink-3 ring-1 ring-inset ring-[color:var(--hairline)]">
                  {drafts.length}
                </span>
              )}
            </div>
          </div>
          {drafts.length === 0 ? (
            <p className="p-8 text-center text-[12.5px] text-ink-5">
              Aún no hay borradores guardados para esta plataforma.
            </p>
          ) : (
            <ul className="divide-y divide-[color:var(--hairline)]">
              {drafts.map((d) => {
                const copy = (() => {
                  if (!d.copyJson) return {} as Record<string, unknown>;
                  try {
                    return JSON.parse(d.copyJson) as Record<string, unknown>;
                  } catch {
                    return {} as Record<string, unknown>;
                  }
                })();
                return (
                  <li key={d.id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="inline-flex items-center rounded-[var(--r-xs)] bg-[var(--surface-2)] px-2 h-5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3 ring-1 ring-inset ring-[color:var(--hairline)]">
                            {d.status}
                          </span>
                        </div>
                        <p className="text-[13px] font-medium text-ink-0 truncate">
                          {d.aiSummary ?? "Borrador sin resumen"}
                        </p>
                        {copy.primaryText ? (
                          <p className="text-[12px] text-ink-5 truncate mt-1">
                            {String(copy.primaryText)}
                          </p>
                        ) : null}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10.5px] uppercase tracking-[0.08em] text-ink-6 mb-0.5">
                          Presupuesto
                        </p>
                        <p className="text-[14px] font-semibold text-ink-0">
                          {d.budgetDaily ? formatCurrencyARS(d.budgetDaily) : "—"}
                          <span className="text-[11px] text-ink-5 font-normal">/día</span>
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-soft)] overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-[color:var(--hairline)]">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-ink-3" />
              <h2 className="text-[14px] font-semibold text-ink-0">Snapshots recientes</h2>
              {insights.length > 0 && (
                <span className="inline-flex items-center rounded-[var(--r-xs)] bg-[var(--surface-2)] px-2 h-5 text-[10.5px] font-medium text-ink-3 ring-1 ring-inset ring-[color:var(--hairline)]">
                  {insights.length}
                </span>
              )}
            </div>
          </div>
          {insights.length === 0 ? (
            <p className="p-8 text-center text-[12.5px] text-ink-5">
              Conectá la cuenta y sincronizá para ver inversión, impresiones, clics y conversiones reales.
            </p>
          ) : (
            <ul className="divide-y divide-[color:var(--hairline)]">
              {insights.slice(0, 4).map((i) => {
                const m = (() => {
                  try {
                    return JSON.parse(i.metricsJson) as Record<string, number | string>;
                  } catch {
                    return {} as Record<string, number | string>;
                  }
                })();
                return (
                  <li key={i.id} className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[11.5px] text-ink-5">{formatDateTime(i.snapshotAt)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-[12px]">
                      <Metric label="Inversión" value={formatCurrencyARS(Number(m.spend ?? 0))} />
                      <Metric label="Impresiones" value={Number(m.impressions ?? 0).toLocaleString("es-AR")} />
                      <Metric label="Clics" value={Number(m.clicks ?? 0).toLocaleString("es-AR")} />
                      <Metric label="Conversiones" value={Number(m.conversions ?? 0).toLocaleString("es-AR")} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-[0.08em] text-ink-6">{label}</p>
      <p className="text-[14px] font-semibold text-ink-0 mt-0.5">{value}</p>
    </div>
  );
}

function InsightsSummary({ insights }: { insights: InsightRow[] }) {
  const totals = useMemo(() => {
    let spend = 0;
    let impressions = 0;
    let clicks = 0;
    let conversions = 0;
    for (const i of insights) {
      try {
        const m = JSON.parse(i.metricsJson) as Record<string, number | string>;
        spend += Number(m.spend ?? 0);
        impressions += Number(m.impressions ?? 0);
        clicks += Number(m.clicks ?? 0);
        conversions += Number(m.conversions ?? 0);
      } catch {
        /* ignore malformed snapshot */
      }
    }
    return { spend, impressions, clicks, conversions };
  }, [insights]);

  if (insights.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
        <Loader2 className="h-5 w-5 text-ink-7 mb-3" />
        <p className="text-[12.5px] text-ink-5 max-w-[18rem]">
          Sin sincronizaciones todavía. Conectá la cuenta y sincronizá para traer datos reales.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 flex-1">
      <Metric label="Inversión total" value={formatCurrencyARS(totals.spend)} />
      <Metric label="Impresiones" value={totals.impressions.toLocaleString("es-AR")} />
      <Metric label="Clics" value={totals.clicks.toLocaleString("es-AR")} />
      <Metric label="Conversiones" value={totals.conversions.toLocaleString("es-AR")} />
    </div>
  );
}
