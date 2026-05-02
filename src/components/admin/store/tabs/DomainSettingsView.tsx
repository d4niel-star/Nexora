import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Globe,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import {
  formatInternalStoreDomain,
  normalizeDomainHost,
  toHttpsUrl,
} from "@/components/admin/store/domain-utils";
import {
  addCustomDomain,
  removeCustomDomain,
  setPrimaryDomain,
  verifyDomainStatus,
} from "@/lib/store-engine/domains/actions";
import { cn } from "@/lib/utils";
import type { AdminStoreInitialData } from "@/types/store-engine";

type DomainUiStatus = "active" | "pending" | "failed" | "internal";

function getDomainType(hostname: string) {
  const parts = hostname.toLowerCase().split(".");
  const isCountryCode =
    parts.length === 3 &&
    parts[2].length === 2 &&
    (parts[1] === "com" || parts[1] === "co" || parts[1] === "net" || parts[1] === "org");

  return parts.length === 2 || isCountryCode ? "apex" : "subdomain";
}

function getDnsRecords(hostname: string) {
  if (getDomainType(hostname) === "apex") {
    return [
      { type: "A", host: "@", value: "76.76.21.21" },
      { type: "CNAME", host: "www", value: "cname.vercel-dns.com" },
    ];
  }

  return [
    {
      type: "CNAME",
      host: hostname.split(".")[0] ?? hostname,
      value: "cname.vercel-dns.com",
    },
  ];
}

export function DomainSettingsView({
  initialData,
  onRefresh,
  pushToast,
  storeId,
}: {
  initialData: AdminStoreInitialData | null;
  onRefresh: () => void;
  pushToast: (title: string, description: string) => void;
  storeId: string | null;
}) {
  const [newDomain, setNewDomain] = useState("");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [addingDomain, setAddingDomain] = useState(false);

  const store = initialData?.store;
  const customDomains = initialData?.domains ?? [];

  const model = useMemo(() => {
    const internalDomain = formatInternalStoreDomain(store?.subdomain, store?.slug);
    const primaryDomain =
      normalizeDomainHost(store?.primaryDomain) ?? internalDomain ?? "sin dominio";
    const usingInternalDomain = !internalDomain
      ? false
      : normalizeDomainHost(primaryDomain) === normalizeDomainHost(internalDomain);
    const pendingDomains = customDomains.filter(
      (domain) => domain.status === "pending" || domain.status === "failed",
    );
    const activeDomains = customDomains.filter((domain) => domain.status === "active");

    const heroStatus: DomainUiStatus =
      pendingDomains.find((domain) => domain.status === "failed")
        ? "failed"
        : pendingDomains.length > 0
          ? "pending"
          : usingInternalDomain
            ? "internal"
            : "active";

    return {
      internalDomain,
      primaryDomain,
      usingInternalDomain,
      pendingDomains,
      activeDomains,
      heroStatus,
    };
  }, [customDomains, store?.primaryDomain, store?.slug, store?.subdomain]);

  if (!store) return null;

  const withAction = async (
    key: string,
    work: () => Promise<unknown>,
    success: { title: string; description: string },
  ) => {
    setLoadingAction(key);
    try {
      await work();
      pushToast(success.title, success.description);
      onRefresh();
    } catch (error) {
      pushToast(
        "No se pudo completar la acción",
        error instanceof Error ? error.message : "Ocurrió un error al operar con el dominio.",
      );
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAddDomain = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newDomain || !storeId) return;

    await withAction(
      "add",
      async () => {
        await addCustomDomain(storeId, newDomain);
        setNewDomain("");
        setAddingDomain(false);
      },
      {
        title: "Dominio agregado",
        description: "El dominio quedó enlazado. Ahora falta validar DNS si corresponde.",
      },
    );
  };

  return (
    <div className="space-y-0">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex flex-col gap-4 border-b border-[color:var(--hairline)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <StatusDot status={model.heroStatus} />
            <p className="text-[13px] font-semibold text-ink-0">
              {model.heroStatus === "active"
                ? "Dominio conectado"
                : model.heroStatus === "internal"
                  ? "Dominio interno"
                  : model.heroStatus === "failed"
                    ? "Error DNS"
                    : "Propagando"}
            </p>
            <StatusPill status={model.heroStatus} />
          </div>
          <p className="mt-1 truncate font-mono text-[12px] text-ink-5">{model.primaryDomain}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAddingDomain((c) => !c)}
            className="inline-flex h-9 items-center gap-2 rounded-full bg-ink-0 px-4 text-[12.5px] font-medium text-ink-12 transition-colors hover:bg-ink-2"
          >
            {addingDomain ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {addingDomain ? "Cancelar" : "Agregar dominio"}
          </button>
          {toHttpsUrl(model.primaryDomain) ? (
            <a
              href={toHttpsUrl(model.primaryDomain) ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-full border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-4 text-[12.5px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-1)]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir
            </a>
          ) : null}
        </div>
      </div>

      {/* ── KPIs ────────────────────────────────────────── */}
      <div className="grid grid-cols-3 divide-x divide-[color:var(--hairline)] border-b border-[color:var(--hairline)]">
        <DomainKpi
          label="Principal"
          value={model.primaryDomain}
          monospace
        />
        <DomainKpi
          label="Conectados"
          value={model.activeDomains.length.toString()}
        />
        <DomainKpi
          label="Pendientes"
          value={model.pendingDomains.length.toString()}
        />
      </div>

      {/* ── Add domain form ─────────────────────────────── */}
      {addingDomain ? (
        <form
          onSubmit={handleAddDomain}
          className="flex items-center gap-3 border-b border-[color:var(--hairline)] bg-[var(--surface-1)] px-5 py-4 sm:px-6"
        >
          <Globe className="h-4 w-4 shrink-0 text-ink-5" />
          <input
            type="text"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="midominio.com"
            className="h-9 flex-1 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-3 font-mono text-[13px] text-ink-0 outline-none transition-shadow placeholder:text-ink-6 focus:shadow-[var(--shadow-focus)]"
          />
          <button
            type="submit"
            disabled={loadingAction !== null || !newDomain.trim()}
            className="inline-flex h-9 items-center gap-2 rounded-full bg-ink-0 px-4 text-[12.5px] font-medium text-ink-12 transition-colors hover:bg-ink-2 disabled:opacity-40"
          >
            {loadingAction === "add" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Guardar
          </button>
        </form>
      ) : null}

      {/* ── Internal domain row ─────────────────────────── */}
      <div className="flex items-center justify-between border-b border-[color:var(--hairline)] px-5 py-3.5 sm:px-6">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-ink-5">Fallback interno</p>
          <p className="mt-0.5 truncate font-mono text-[13px] font-semibold text-ink-0">
            {model.internalDomain ?? "No disponible"}
          </p>
        </div>
        {!model.usingInternalDomain && model.internalDomain && storeId ? (
          <button
            type="button"
            className="shrink-0 text-[12px] font-medium text-ink-3 transition-colors hover:text-ink-0 disabled:opacity-40"
            disabled={loadingAction !== null}
            onClick={() =>
              withAction("primary-internal", () => setPrimaryDomain(storeId, model.internalDomain!), {
                title: "Dominio actualizado",
                description: "El subdominio interno quedó como principal.",
              })
            }
          >
            {loadingAction === "primary-internal" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              "Hacer principal"
            )}
          </button>
        ) : null}
      </div>

      {/* ── Connected domains list ──────────────────────── */}
      {customDomains.length === 0 ? (
        <div className="px-5 py-8 text-center sm:px-6">
          <Globe className="mx-auto h-5 w-5 text-ink-6" strokeWidth={1.5} />
          <p className="mt-2 text-[13px] font-medium text-ink-0">Sin dominios propios</p>
          <p className="mt-1 text-[12px] text-ink-5">
            Conectá un dominio propio para mejorar presencia y confianza.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[color:var(--hairline)]">
          {customDomains.map((domain) => {
            const status: DomainUiStatus =
              domain.status === "active"
                ? "active"
                : domain.status === "failed"
                  ? "failed"
                  : "pending";
            const dnsRecords = getDnsRecords(domain.hostname);
            const actionKey = domain.id;

            return (
              <div key={domain.id} className="px-5 py-4 sm:px-6">
                {/* Domain row */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <StatusDot status={status} />
                    <p className="truncate font-mono text-[13px] font-semibold text-ink-0">
                      {domain.hostname}
                    </p>
                    <StatusPill status={status} />
                    {domain.isPrimary ? (
                      <span className="rounded-full bg-[var(--surface-1)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-5">
                        Principal
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    {status !== "active" ? (
                      <button
                        type="button"
                        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-ink-0 px-3 text-[12px] font-medium text-ink-12 transition-colors hover:bg-ink-2 disabled:opacity-40"
                        disabled={loadingAction !== null || !storeId}
                        onClick={() =>
                          withAction(
                            `verify-${actionKey}`,
                            () => verifyDomainStatus(domain.id, storeId!),
                            { title: "Verificado", description: "La conexión se validó." },
                          )
                        }
                      >
                        {loadingAction === `verify-${actionKey}` ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                        Verificar
                      </button>
                    ) : null}

                    {!domain.isPrimary ? (
                      <button
                        type="button"
                        className="h-8 rounded-full border border-[color:var(--hairline-strong)] px-3 text-[12px] font-medium text-ink-2 transition-colors hover:text-ink-0 disabled:opacity-40"
                        disabled={loadingAction !== null || !storeId}
                        onClick={() =>
                          withAction(
                            `primary-${actionKey}`,
                            () => setPrimaryDomain(storeId!, domain.hostname),
                            { title: "Principal actualizado", description: `${domain.hostname} es ahora principal.` },
                          )
                        }
                      >
                        {loadingAction === `primary-${actionKey}` ? (
                          <Loader2 className="inline h-3 w-3 animate-spin" />
                        ) : (
                          "Principal"
                        )}
                      </button>
                    ) : null}

                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-5 transition-colors hover:bg-[var(--surface-1)] hover:text-[color:var(--signal-danger)] disabled:opacity-40"
                      disabled={loadingAction !== null || !storeId}
                      onClick={() =>
                        withAction(
                          `remove-${actionKey}`,
                          () => removeCustomDomain(domain.id, storeId!),
                          { title: "Removido", description: `${domain.hostname} fue desvinculado.` },
                        )
                      }
                    >
                      {loadingAction === `remove-${actionKey}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* DNS records (only for non-active) */}
                {status !== "active" ? (
                  <div className="mt-3 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)]">
                    <div className="flex items-center gap-2 px-3 py-2">
                      <AlertTriangle
                        className={cn(
                          "h-3.5 w-3.5",
                          status === "failed"
                            ? "text-[color:var(--signal-danger)]"
                            : "text-[color:var(--signal-warning)]",
                        )}
                      />
                      <p className="text-[11px] font-medium text-ink-3">Registros DNS requeridos</p>
                    </div>
                    <table className="w-full text-left text-[12px]">
                      <thead className="border-t border-[color:var(--hairline)] bg-[var(--surface-1)] text-[10px] uppercase tracking-[0.12em] text-ink-5">
                        <tr>
                          <th className="px-3 py-1.5 font-medium">Tipo</th>
                          <th className="px-3 py-1.5 font-medium">Host</th>
                          <th className="px-3 py-1.5 font-medium">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[color:var(--hairline)] bg-[var(--surface-0)]">
                        {dnsRecords.map((record) => (
                          <tr key={`${domain.id}-${record.type}-${record.host}`}>
                            <td className="px-3 py-2 font-mono font-semibold text-ink-0">{record.type}</td>
                            <td className="px-3 py-2 font-mono text-ink-0">{record.host}</td>
                            <td className="px-3 py-2 font-mono text-ink-0">{record.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────

function StatusDot({ status }: { status: DomainUiStatus }) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        status === "active" && "bg-[color:var(--signal-success)]",
        status === "pending" && "bg-[color:var(--signal-warning)]",
        status === "failed" && "bg-[color:var(--signal-danger)]",
        status === "internal" && "bg-ink-6",
      )}
    />
  );
}

function StatusPill({ status }: { status: DomainUiStatus }) {
  const label =
    status === "active" ? "Activo" : status === "pending" ? "Pendiente" : status === "failed" ? "Error" : "Interno";

  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em]",
        status === "active" &&
          "bg-[color:color-mix(in_srgb,var(--signal-success)_12%,transparent)] text-[color:var(--signal-success)]",
        status === "pending" &&
          "bg-[color:color-mix(in_srgb,var(--signal-warning)_12%,transparent)] text-[color:var(--signal-warning)]",
        status === "failed" &&
          "bg-[color:color-mix(in_srgb,var(--signal-danger)_12%,transparent)] text-[color:var(--signal-danger)]",
        status === "internal" && "bg-[var(--surface-1)] text-ink-5",
      )}
    >
      {label}
    </span>
  );
}

function DomainKpi({
  label,
  value,
  monospace,
}: {
  label: string;
  value: string;
  monospace?: boolean;
}) {
  return (
    <div className="px-5 py-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-5">{label}</p>
      <p
        className={cn(
          "mt-1.5 truncate text-[15px] font-semibold text-ink-0",
          monospace && "font-mono text-[12px]",
        )}
      >
        {value}
      </p>
    </div>
  );
}
