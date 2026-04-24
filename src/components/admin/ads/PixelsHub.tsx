"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Code2,
  Eraser,
  ExternalLink,
  Eye,
  EyeOff,
  Save,
} from "lucide-react";

import { MotionButton } from "@/components/admin/store/primitives/MotionButton";
import {
  ADS_PROVIDERS,
  type AdsProviderId,
  type AdsProviderMeta,
} from "@/lib/ads/registry";
import {
  clearPixelConfig,
  savePixelConfig,
  type PixelConfigSnapshot,
} from "@/lib/ads/pixels/actions";

// ─── Píxeles y tags hub ─────────────────────────────────────────────────
//
// Owns every non-secret integration parameter the merchant has to copy
// from their ad platform: Pixel IDs, Conversions API tokens, Google
// Tags, Conversion Labels, Merchant Center IDs, etc. One column per
// provider, fields driven entirely by `ADS_PROVIDERS[provider].pixelFields`
// so adding a new field = editing the registry, not this component.
//
// We deliberately separate this from the OAuth/connection lifecycle:
//   · The connection card on /admin/ads/{provider} talks to OAuth.
//   · This page talks to AdPlatformConnection.configJson via
//     `lib/ads/pixels/actions.ts`, which upserts a `pending` row when
//     no connection exists yet (so the values are not lost).

interface PixelsHubProps {
  storeId: string;
  configs: PixelConfigSnapshot[];
}

export function PixelsHub({ storeId, configs }: PixelsHubProps) {
  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[12px] text-ink-6">
            <Link href="/admin/ads/meta" className="hover:text-ink-2 transition-colors">
              Marketing
            </Link>
            <span aria-hidden>›</span>
            <span className="text-ink-2 font-medium">Píxeles y tags</span>
          </div>
          <h1 className="text-[28px] lg:text-[32px] font-semibold leading-[1.08] tracking-[-0.035em] text-ink-0">
            Píxeles y tags.
          </h1>
          <p className="text-[14px] leading-[1.55] text-ink-5 max-w-2xl">
            Identificadores y tokens técnicos de cada plataforma. Estos valores son los que pegás
            desde Events Manager / Google Tag Manager para que la atribución, las conversiones y
            las audiencias funcionen correctamente. No son secretos pero sí son específicos de tu
            cuenta — los almacenamos como configuración por proveedor.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {configs.map((snapshot) => {
          const meta = ADS_PROVIDERS[snapshot.provider];
          return (
            <ProviderPixelCard
              key={snapshot.provider}
              storeId={storeId}
              meta={meta}
              snapshot={snapshot}
            />
          );
        })}
      </div>

      <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-5 text-[12.5px] text-ink-4 leading-[1.6]">
        <p className="font-semibold text-ink-2 mb-1.5">¿Dónde encuentro estos IDs?</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong className="text-ink-2">Meta Pixel ID</strong>: Events Manager → Orígenes de
            datos → seleccioná el píxel → ID en la esquina superior.
          </li>
          <li>
            <strong className="text-ink-2">TikTok Pixel Code</strong>: TikTok Ads → Eventos →
            Administrador de eventos web → Pixel Code.
          </li>
          <li>
            <strong className="text-ink-2">Google Tag</strong>: Google Ads → Herramientas →
            Conversiones → seleccioná la conversión → Configuración del tag.
          </li>
        </ul>
      </section>
    </div>
  );
}

function ProviderPixelCard({
  storeId,
  meta,
  snapshot,
}: {
  storeId: string;
  meta: AdsProviderMeta;
  snapshot: PixelConfigSnapshot;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<null | "save" | "clear">(null);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...snapshot.config }));
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const configuredCount = meta.pixelFields.filter(
    (f) => (values[f.key] ?? "").trim().length > 0,
  ).length;
  const requiredMissing = meta.pixelFields.some(
    (f) => f.required && !(values[f.key] ?? "").trim(),
  );

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy("save");
    setFeedback(null);
    try {
      const result = await savePixelConfig(storeId, meta.id, values);
      // Re-read from server result so we don't desync if validation
      // dropped any unknown / out-of-schema keys client-side.
      setValues({ ...result.config });
      setFeedback({ tone: "ok", text: "Configuración guardada." });
      startTransition(() => router.refresh());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "No se pudo guardar.";
      setFeedback({ tone: "err", text: msg });
    } finally {
      setBusy(null);
    }
  };

  const handleClear = async () => {
    if (!window.confirm(`¿Borrar todos los identificadores de ${meta.label}? La conexión OAuth no se ve afectada.`)) return;
    setBusy("clear");
    setFeedback(null);
    try {
      const result = await clearPixelConfig(storeId, meta.id);
      setValues({ ...result.config });
      setFeedback({ tone: "ok", text: "Identificadores borrados." });
      startTransition(() => router.refresh());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "No se pudo borrar.";
      setFeedback({ tone: "err", text: msg });
    } finally {
      setBusy(null);
    }
  };

  return (
    <form
      onSubmit={handleSave}
      className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-soft)] flex flex-col"
    >
      <header className="flex items-start justify-between p-5 border-b border-[color:var(--hairline)] gap-3">
        <div className="flex items-center gap-3">
          <span
            className="h-9 w-9 rounded-[var(--r-sm)] flex items-center justify-center ring-1 ring-inset ring-[color:var(--hairline)]"
            style={{
              backgroundColor: `color-mix(in srgb, ${meta.accent} 14%, transparent)`,
              color: meta.accent,
            }}
            aria-hidden
          >
            <Code2 className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-[14px] font-semibold text-ink-0">{meta.label}</h3>
            <p className="text-[11.5px] text-ink-5">
              {configuredCount}/{meta.pixelFields.length} configurados
            </p>
          </div>
        </div>
        <a
          href={meta.docsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-[var(--r-xs)] text-[11px] text-ink-5 hover:text-ink-2 transition-colors"
          title="Abrir documentación"
        >
          <ExternalLink className="h-3 w-3" />
          Docs
        </a>
      </header>

      <div className="p-5 space-y-4 flex-1">
        {meta.pixelFields.map((field) => {
          const isSensitive = field.key.includes("token");
          const hidden = isSensitive && !revealed[field.key];
          const value = values[field.key] ?? "";
          return (
            <div key={field.key} className="space-y-1.5">
              <label
                htmlFor={`${meta.id}-${field.key}`}
                className="flex items-center justify-between text-[12px] font-medium text-ink-2"
              >
                <span>
                  {field.label}
                  {field.required && (
                    <span className="text-[color:var(--signal-danger)] ml-0.5">*</span>
                  )}
                </span>
                {isSensitive && (
                  <button
                    type="button"
                    onClick={() => setRevealed((s) => ({ ...s, [field.key]: !s[field.key] }))}
                    className="text-ink-5 hover:text-ink-2 transition-colors inline-flex items-center gap-1 text-[11px]"
                  >
                    {hidden ? (
                      <>
                        <Eye className="h-3 w-3" /> Mostrar
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3 w-3" /> Ocultar
                      </>
                    )}
                  </button>
                )}
              </label>
              <input
                id={`${meta.id}-${field.key}`}
                name={field.key}
                type={hidden ? "password" : "text"}
                inputMode="text"
                spellCheck={false}
                autoComplete="off"
                placeholder={field.placeholder}
                value={value}
                pattern={field.pattern}
                maxLength={field.maxLength}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [field.key]: e.target.value }))
                }
                className="w-full h-10 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-3 text-[13px] font-mono text-ink-0 placeholder:text-ink-7 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-500)]/40 focus:border-[color:var(--accent-500)] transition-all"
              />
              <p className="text-[11px] text-ink-6 leading-[1.4]">{field.helper}</p>
            </div>
          );
        })}

        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className={`rounded-[var(--r-sm)] border p-2.5 text-[11.5px] flex items-start gap-1.5 ${
                feedback.tone === "err"
                  ? "border-[color:color-mix(in_srgb,var(--signal-danger)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--signal-danger)_8%,transparent)] text-[color:var(--signal-danger)]"
                  : "border-[color:color-mix(in_srgb,var(--signal-success)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--signal-success)_8%,transparent)] text-[color:var(--signal-success)]"
              }`}
            >
              {feedback.tone === "err" ? (
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {requiredMissing && (
          <p className="text-[11px] text-[color:var(--signal-warning)] flex items-center gap-1.5">
            <AlertCircle className="h-3 w-3" />
            Faltan campos requeridos para activar la atribución.
          </p>
        )}
      </div>

      <footer className="flex items-center justify-between gap-3 p-4 border-t border-[color:var(--hairline)] bg-[var(--surface-1)]">
        <MotionButton
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
          loading={busy === "clear"}
          leftIcon={<Eraser />}
          disabled={configuredCount === 0}
        >
          Borrar todo
        </MotionButton>
        <MotionButton
          type="submit"
          variant="primary"
          size="sm"
          loading={busy === "save" || pending}
          leftIcon={<Save />}
        >
          Guardar
        </MotionButton>
      </footer>
    </form>
  );
}
