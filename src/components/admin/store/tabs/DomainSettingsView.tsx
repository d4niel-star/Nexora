import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Globe,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
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

const solidButtonClasses =
  "inline-flex h-10 items-center gap-2 rounded-[var(--r-sm)] bg-ink-0 px-4 text-[13px] font-medium text-ink-12 transition-colors hover:bg-ink-2 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)] disabled:cursor-not-allowed disabled:opacity-40";

const outlineButtonClasses =
  "inline-flex h-10 items-center gap-2 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-4 text-[13px] font-medium text-ink-0 transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)] disabled:cursor-not-allowed disabled:opacity-40";

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

    const heroTitle =
      heroStatus === "active"
        ? "Dominio principal conectado y operativo"
        : heroStatus === "internal"
          ? "La tienda opera, pero sigue sobre dominio interno"
          : heroStatus === "failed"
            ? "Hay errores DNS que impiden validar el dominio"
            : "El dominio esta enlazado y esperando propagacion";

    const heroDescription =
      heroStatus === "active"
        ? "El frente comercial ya usa un dominio propio y la conexion esta resuelta."
        : heroStatus === "internal"
          ? "Todavia no hay un dominio propio como frente de marca. El fallback interno sigue activo."
          : heroStatus === "failed"
            ? "Mi tienda detecta dominios con validacion fallida; hace falta corregir DNS y reintentar."
            : "El dominio ya fue agregado, pero todavia no termino de propagar o verificar.";

    return {
      internalDomain,
      primaryDomain,
      usingInternalDomain,
      pendingDomains,
      activeDomains,
      heroStatus,
      heroTitle,
      heroDescription,
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
        "No se pudo completar la accion",
        error instanceof Error ? error.message : "Ocurrio un error al operar con el dominio.",
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
        description: "El dominio quedo enlazado. Ahora falta validar DNS si corresponde.",
      },
    );
  };

  return (
    <div className="space-y-6 p-6">
      <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.9fr] xl:items-end">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-5">
              <Globe className="h-3.5 w-3.5" />
              Dominio y DNS
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[24px] font-semibold leading-[1.08] tracking-[-0.028em] text-ink-0">
                  {model.heroTitle}
                </h2>
                <DomainStatusPill status={model.heroStatus} />
              </div>
              <p className="max-w-2xl text-[13.5px] leading-[1.6] text-ink-5">
                {model.heroDescription}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAddingDomain((current) => !current)}
                className={solidButtonClasses}
              >
                <Plus className="h-3.5 w-3.5" />
                {addingDomain ? "Cerrar alta" : "Agregar dominio"}
              </button>
              <button type="button" onClick={onRefresh} className={outlineButtonClasses}>
                <RefreshCw className="h-3.5 w-3.5" />
                Actualizar estado
              </button>
              {toHttpsUrl(model.primaryDomain) ? (
                <a
                  href={toHttpsUrl(model.primaryDomain) ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className={outlineButtonClasses}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Abrir dominio
                </a>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <DomainStat
              label="Principal"
              value={model.primaryDomain}
              description={model.usingInternalDomain ? "Fallback interno" : "Frente comercial"}
              monospace
            />
            <DomainStat
              label="Conectados"
              value={model.activeDomains.length.toString()}
              description="Dominios activos"
            />
            <DomainStat
              label="Con accion"
              value={model.pendingDomains.length.toString()}
              description={
                model.pendingDomains.length > 0 ? "Requieren DNS o validacion" : "Sin pendientes"
              }
            />
          </div>
        </div>
      </section>

      {addingDomain ? (
        <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-5">
                Alta de dominio
              </p>
              <h3 className="mt-2 text-[17px] font-semibold tracking-[-0.015em] text-ink-0">
                Conecta un dominio comprado externamente
              </h3>
              <p className="mt-1 max-w-2xl text-[12.5px] leading-[1.55] text-ink-5">
                Ingresa un dominio como <span className="font-mono text-[12px]">mitienda.com</span>{" "}
                o un subdominio como <span className="font-mono text-[12px]">shop.mitienda.com</span>.
              </p>
            </div>

            <form onSubmit={handleAddDomain} className="flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-6" />
                <input
                  type="text"
                  value={newDomain}
                  onChange={(event) => setNewDomain(event.target.value)}
                  placeholder="midominio.com"
                  className="h-11 w-full rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] pl-10 pr-4 text-[13px] font-medium text-ink-0 outline-none transition-[box-shadow,border-color] placeholder:text-ink-6 focus:border-[var(--accent-500)] focus:shadow-[var(--shadow-focus)]"
                />
              </div>
              <button
                type="submit"
                disabled={loadingAction !== null || !newDomain.trim()}
                className={solidButtonClasses}
              >
                {loadingAction === "add" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Guardar dominio
              </button>
            </form>
          </div>
        </section>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5">
          <div className="mb-4 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-5">
              Estado tecnico
            </p>
            <h3 className="text-[17px] font-semibold tracking-[-0.015em] text-ink-0">
              Dominio principal y enrutamiento
            </h3>
            <p className="text-[12.5px] leading-[1.55] text-ink-5">
              Lectura rapida de principal, propagacion y fallback disponible para no perder acceso.
            </p>
          </div>

          <div className="divide-y divide-[color:var(--hairline)]">
            <TechnicalRow
              label="Dominio principal"
              value={model.primaryDomain}
              description={
                model.usingInternalDomain
                  ? "La tienda publica con el subdominio interno."
                  : "El dominio principal ya apunta a la marca."
              }
              monospace
            />
            <TechnicalRow
              label="Conexion"
              value={
                model.heroStatus === "active"
                  ? "Activa"
                  : model.heroStatus === "internal"
                    ? "Interna"
                    : "Requiere accion"
              }
              description={
                model.heroStatus === "active"
                  ? "El trafico enruta correctamente."
                  : model.heroStatus === "internal"
                    ? "La tienda sigue accesible por fallback."
                    : "Hay que revisar DNS o validar propagacion."
              }
            />
            <TechnicalRow
              label="DNS"
              value={model.pendingDomains.length > 0 ? "Pendiente" : "Sin pendientes"}
              description={
                model.pendingDomains.length > 0
                  ? `${model.pendingDomains.length} dominio${model.pendingDomains.length === 1 ? "" : "s"} requiere${model.pendingDomains.length === 1 ? "" : "n"} revision.`
                  : "No hay tareas DNS activas dentro de Mi tienda."
              }
            />
            <TechnicalRow
              label="Fallback interno"
              value={model.internalDomain ?? "No disponible"}
              description="Siempre puedes volver al dominio interno si necesitas recuperar acceso."
              monospace
            />
          </div>
        </section>

        <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5">
          <div className="mb-4 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-5">
              Siguiente paso
            </p>
            <h3 className="text-[17px] font-semibold tracking-[-0.015em] text-ink-0">
              Que hacer ahora
            </h3>
          </div>

          <div className="space-y-3">
            <NextStep
              status={model.heroStatus}
              title={
                model.heroStatus === "active"
                  ? "Dominio resuelto"
                  : model.heroStatus === "internal"
                    ? "Conecta un dominio propio"
                    : model.heroStatus === "failed"
                      ? "Corrige DNS y revalida"
                      : "Espera propagacion y valida"
              }
              description={
                model.heroStatus === "active"
                  ? "No hay una accion critica pendiente. Solo mantene este dominio como principal."
                  : model.heroStatus === "internal"
                    ? "Agrega un dominio para que la tienda deje de salir con el subdominio interno."
                    : model.heroStatus === "failed"
                      ? "Revisa los registros solicitados y vuelve a verificar el dominio."
                      : "Cuando completes DNS, usa Verificar conexion para cerrar el setup."
              }
            />

            {!model.usingInternalDomain && model.internalDomain ? (
              <button
                type="button"
                className={outlineButtonClasses}
                disabled={loadingAction !== null || !storeId}
                onClick={() =>
                  withAction(
                    "primary-internal",
                    () => setPrimaryDomain(storeId!, model.internalDomain!),
                    {
                      title: "Dominio principal actualizado",
                      description: "El subdominio interno quedo otra vez como dominio principal.",
                    },
                  )
                }
              >
                {loadingAction === "primary-internal" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5" />
                )}
                Volver al dominio interno
              </button>
            ) : null}
          </div>
        </section>
      </div>

      <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-5">
              Dominio interno
            </p>
            <h3 className="mt-2 text-[17px] font-semibold tracking-[-0.015em] text-ink-0">
              Fallback operativo
            </h3>
            <p className="mt-1 max-w-2xl text-[12.5px] leading-[1.55] text-ink-5">
              Este dominio siempre queda disponible para recuperar acceso, validar la tienda o usarlo como respaldo.
            </p>
          </div>

          {!model.usingInternalDomain && model.internalDomain ? (
            <button
              type="button"
              className={outlineButtonClasses}
              disabled={loadingAction !== null || !storeId}
              onClick={() =>
                withAction("internal-primary", () => setPrimaryDomain(storeId!, model.internalDomain!), {
                  title: "Fallback principal activado",
                  description: "El subdominio interno quedo marcado como principal.",
                })
              }
            >
              {loadingAction === "internal-primary" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Hacer principal
            </button>
          ) : null}
        </div>

        <div className="mt-4 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-4 py-3">
          <p className="font-mono text-[13px] font-semibold text-ink-0">
            {model.internalDomain ?? "Sin dominio interno"}
          </p>
          <p className="mt-1 text-[12px] text-ink-5">
            No es el frente ideal para clientes, pero te deja la tienda accesible incluso si el dominio propio falla.
          </p>
        </div>
      </section>

      <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-5">
        <div className="mb-4 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-5">
            Dominios conectados
          </p>
          <h3 className="text-[17px] font-semibold tracking-[-0.015em] text-ink-0">
            Inventario tecnico
          </h3>
          <p className="text-[12.5px] leading-[1.55] text-ink-5">
            Cada dominio muestra su estado real, la accion disponible y los registros DNS necesarios cuando aplica.
          </p>
        </div>

        {customDomains.length === 0 ? (
          <div className="rounded-[var(--r-sm)] border border-dashed border-[color:var(--hairline)] bg-[var(--surface-1)] px-4 py-5">
            <p className="text-[13px] font-medium text-ink-0">Todavia no hay dominios propios conectados</p>
            <p className="mt-1 max-w-2xl text-[12px] leading-[1.55] text-ink-5">
              La tienda sigue operativa con el fallback interno, pero conectar un dominio propio mejora presencia, confianza y claridad comercial.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {customDomains.map((domain) => {
              const status =
                domain.status === "active"
                  ? "active"
                  : domain.status === "failed"
                    ? "failed"
                    : "pending";
              const dnsRecords = getDnsRecords(domain.hostname);
              const actionKeyBase = domain.id;

              return (
                <article
                  key={domain.id}
                  className="overflow-hidden rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)]"
                >
                  <div className="flex flex-col gap-4 p-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-[13px] font-semibold text-ink-0">
                          {domain.hostname}
                        </p>
                        <DomainStatusPill status={status} />
                        {domain.isPrimary ? (
                          <span className="rounded-full bg-[var(--surface-1)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-5">
                            Principal
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[12px] leading-[1.55] text-ink-5">
                        {status === "active"
                          ? "El dominio ya enruta correctamente hacia la tienda."
                          : status === "failed"
                            ? "La ultima validacion fallo. Revisa DNS y vuelve a intentar."
                            : "El dominio aun no termino de propagar o validar su DNS."}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {status !== "active" ? (
                        <button
                          type="button"
                          className={solidButtonClasses}
                          disabled={loadingAction !== null || !storeId}
                          onClick={() =>
                            withAction(
                              `verify-${actionKeyBase}`,
                              () => verifyDomainStatus(domain.id, storeId!),
                              {
                                title: "Dominio verificado",
                                description: "La conexion del dominio se valido correctamente.",
                              },
                            )
                          }
                        >
                          {loadingAction === `verify-${actionKeyBase}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          Verificar conexion
                        </button>
                      ) : null}

                      {!domain.isPrimary ? (
                        <button
                          type="button"
                          className={outlineButtonClasses}
                          disabled={loadingAction !== null || !storeId}
                          onClick={() =>
                            withAction(
                              `primary-${actionKeyBase}`,
                              () => setPrimaryDomain(storeId!, domain.hostname),
                              {
                                title: "Dominio principal actualizado",
                                description: `${domain.hostname} quedo marcado como principal.`,
                              },
                            )
                          }
                        >
                          {loadingAction === `primary-${actionKeyBase}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : null}
                          Hacer principal
                        </button>
                      ) : null}

                      <button
                        type="button"
                        className={cn(outlineButtonClasses, "text-[color:var(--signal-danger)]")}
                        disabled={loadingAction !== null || !storeId}
                        onClick={() =>
                          withAction(
                            `remove-${actionKeyBase}`,
                            () => removeCustomDomain(domain.id, storeId!),
                            {
                              title: "Dominio removido",
                              description: `${domain.hostname} dejo de estar asociado a la tienda.`,
                            },
                          )
                        }
                      >
                        {loadingAction === `remove-${actionKeyBase}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Remover
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-[color:var(--hairline)] bg-[var(--surface-1)] px-4 py-4">
                    <div className="grid gap-3 md:grid-cols-3">
                      <TechnicalMiniCard
                        label="Estado"
                        value={status === "active" ? "Activo" : status === "failed" ? "Error" : "Pendiente"}
                      />
                      <TechnicalMiniCard
                        label="Tipo"
                        value={getDomainType(domain.hostname) === "apex" ? "Apex" : "Subdominio"}
                      />
                      <TechnicalMiniCard
                        label="Principal"
                        value={domain.isPrimary ? "Si" : "No"}
                      />
                    </div>

                    {status !== "active" ? (
                      <div className="mt-4 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle
                            className={cn(
                              "mt-0.5 h-4 w-4 shrink-0",
                              status === "failed"
                                ? "text-[color:var(--signal-danger)]"
                                : "text-[color:var(--signal-warning)]",
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-ink-0">
                              Registros DNS requeridos
                            </p>
                            <p className="mt-1 text-[12px] leading-[1.55] text-ink-5">
                              Configura estos registros en tu proveedor DNS y luego vuelve a verificar la conexion.
                            </p>

                            <div className="mt-4 overflow-hidden rounded-[var(--r-sm)] border border-[color:var(--hairline)]">
                              <table className="w-full text-left text-[12px]">
                                <thead className="bg-[var(--surface-1)] text-[10px] uppercase tracking-[0.14em] text-ink-5">
                                  <tr>
                                    <th className="px-3 py-2 font-medium">Tipo</th>
                                    <th className="px-3 py-2 font-medium">Host</th>
                                    <th className="px-3 py-2 font-medium">Valor</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[color:var(--hairline)] bg-[var(--surface-0)]">
                                  {dnsRecords.map((record) => (
                                    <tr key={`${domain.id}-${record.type}-${record.host}`}>
                                      <td className="px-3 py-3 font-mono font-semibold text-ink-0">
                                        {record.type}
                                      </td>
                                      <td className="px-3 py-3 font-mono text-ink-0">
                                        {record.host}
                                      </td>
                                      <td className="px-3 py-3 font-mono text-ink-0">
                                        {record.value}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function DomainStatusPill({ status }: { status: DomainUiStatus }) {
  const label =
    status === "active"
      ? "Activo"
      : status === "pending"
        ? "Pendiente"
        : status === "failed"
          ? "Error"
          : "Interno";

  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
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

function DomainStat({
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
      <p className={cn("mt-2 text-[15px] font-semibold text-ink-0", monospace && "font-mono text-[12px]")}>
        {value}
      </p>
      <p className="mt-1 text-[11.5px] text-ink-5">{description}</p>
    </div>
  );
}

function TechnicalRow({
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
    <div className="grid gap-2 py-4 first:pt-0 last:pb-0 md:grid-cols-[1fr_auto] md:items-start">
      <div>
        <p className="text-[13px] font-medium text-ink-0">{label}</p>
        <p className="mt-1 text-[12px] leading-[1.55] text-ink-5">{description}</p>
      </div>
      <p className={cn("text-[13px] font-semibold text-ink-0", monospace && "font-mono text-[12px]")}>
        {value}
      </p>
    </div>
  );
}

function TechnicalMiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-0)] px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-5">{label}</p>
      <p className="mt-2 text-[13px] font-semibold text-ink-0">{value}</p>
    </div>
  );
}

function NextStep({
  status,
  title,
  description,
}: {
  status: DomainUiStatus;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-4 py-4">
      <div className="flex items-start gap-3">
        {status === "active" ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-[color:var(--signal-success)]" />
        ) : (
          <AlertTriangle
            className={cn(
              "mt-0.5 h-4 w-4",
              status === "failed"
                ? "text-[color:var(--signal-danger)]"
                : "text-[color:var(--signal-warning)]",
            )}
          />
        )}
        <div>
          <p className="text-[13px] font-medium text-ink-0">{title}</p>
          <p className="mt-1 text-[12px] leading-[1.55] text-ink-5">{description}</p>
        </div>
      </div>
    </div>
  );
}
