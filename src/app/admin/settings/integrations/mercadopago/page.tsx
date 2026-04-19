import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Copy, ExternalLink, ShieldAlert, XCircle } from "lucide-react";
import { isCurrentUserOps } from "@/lib/auth/ops";
import {
  getMercadoPagoPlatformReadiness,
  type MercadoPagoEnvFieldStatus,
} from "@/lib/payments/mercadopago/platform-readiness";
import { MercadoPagoSetupChecklist } from "@/components/admin/settings/MercadoPagoSetupChecklist";

// ─── Mercado Pago platform integration readiness (ops-only) ──────────────
// This is the surface where Nexora ops can *diagnose* whether the platform
// can initiate MP OAuth for any tenant. It deliberately does NOT accept
// edits: MP_CLIENT_SECRET must live as an infrastructure env, never as a
// DB row, so there is nothing to "save" here.
//
// Merchants cannot reach this page (ops allowlist). Non-ops requests are
// answered with notFound() so the route doesn't even exist from their POV.

export const dynamic = "force-dynamic";

export default async function MercadoPagoPlatformSettingsPage() {
  if (!(await isCurrentUserOps())) {
    // Intentionally return 404 instead of 403 so non-ops users never learn
    // this surface exists. Mirrors the convention in lib/auth/ops.ts.
    notFound();
  }

  const readiness = getMercadoPagoPlatformReadiness();

  return (
    <div className="animate-in fade-in space-y-8 py-6 duration-500">
      <div className="flex flex-col gap-2">
        <Link
          href="/admin/settings"
          className="inline-flex w-fit items-center gap-1.5 text-[12px] font-medium text-ink-5 transition-colors hover:text-ink-0"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
          Configuración
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[28px] font-semibold leading-[1.08] tracking-[-0.035em] text-ink-0 lg:text-[32px]">
            Mercado Pago · Plataforma.
          </h1>
          <span
            className={
              readiness.ready
                ? "inline-flex items-center gap-1.5 rounded-full border border-[color:var(--hairline)] bg-[var(--surface-0)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[color:var(--signal-success)]"
                : "inline-flex items-center gap-1.5 rounded-full border border-[color:var(--hairline)] bg-[var(--surface-0)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[color:var(--signal-warning)]"
            }
          >
            {readiness.ready ? (
              <CheckCircle2 className="h-3 w-3" strokeWidth={2} />
            ) : (
              <ShieldAlert className="h-3 w-3" strokeWidth={2} />
            )}
            {readiness.ready ? "Plataforma lista" : "Faltan variables"}
          </span>
        </div>
        <p className="max-w-2xl text-[13px] leading-[1.55] text-ink-5">
          Configuración global de la integración OAuth con Mercado Pago. Es un diagnóstico de solo lectura: los
          secretos se cargan como variables de entorno de infraestructura y <em>nunca</em> se persisten en la base de
          datos de Nexora. Esta pantalla sólo reporta su presencia.
        </p>
      </div>

      <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-[14px] font-semibold text-ink-0">Estado de configuración</h2>
          <p className="text-[12px] text-ink-5">
            Una sola configuración global aplica a <strong>todas las tiendas</strong> del deployment. Los tokens
            por tenant se mantienen cifrados en DB y son independientes de estas variables.
          </p>
        </div>

        <ul className="mt-5 divide-y divide-[color:var(--hairline)]">
          {readiness.fields.map((field) => (
            <FieldRow key={field.key} field={field} />
          ))}
        </ul>

        {readiness.ready ? (
          <div className="mt-6 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-4 py-3 text-[12px] text-ink-3">
            <p className="font-medium text-[color:var(--signal-success)]">OAuth habilitado.</p>
            <p className="mt-1 text-ink-5">
              Los dueños de tienda pueden iniciar el flujo de conexión desde el tab <em>Pagos</em> del panel de su
              tienda. Nexora redirige al Developer Dashboard de MP y persiste el access token cifrado por tenant.
            </p>
          </div>
        ) : (
          <div className="mt-6 rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-4 py-3 text-[12px] text-ink-3">
            <p className="font-medium text-[color:var(--signal-warning)]">OAuth deshabilitado a nivel plataforma.</p>
            <p className="mt-1 text-ink-5">
              Ningún tenant puede conectar Mercado Pago hasta que las variables faltantes estén cargadas en la
              infraestructura (Vercel / Railway / hosting equivalente) y se redeployee la aplicación.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
        <h2 className="text-[14px] font-semibold text-ink-0">Parámetros de OAuth</h2>
        <p className="mt-1 text-[12px] text-ink-5">
          Configurados desde el Developer Dashboard de Mercado Pago; deben coincidir con los valores cargados acá.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <ReadonlyField
            label="Redirect URI"
            value={readiness.redirectUri ?? "Se define al cargar NEXT_PUBLIC_APP_URL"}
            hint="Debe dar de alta idéntica en MP → Tu aplicación → Redirect URIs."
            copyable={Boolean(readiness.redirectUri)}
          />
          <ReadonlyField
            label="Authorize URL"
            value="https://auth.mercadopago.com/authorization"
            hint="Endpoint de MP que Nexora usa para iniciar OAuth."
            copyable
          />
          <ReadonlyField
            label="Token URL"
            value="https://api.mercadopago.com/oauth/token"
            hint="Endpoint de MP para intercambiar code → access token y refresh."
            copyable
          />
          <ReadonlyField
            label="Scope"
            value="offline_access read write"
            hint="Scope mínimo requerido; Nexora nunca pide más."
            copyable={false}
          />
        </div>

        <a
          href="https://www.mercadopago.com.ar/developers/es/docs/security/oauth/introduction"
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-0 underline underline-offset-4"
        >
          Documentación oficial OAuth de Mercado Pago
          <ExternalLink className="h-3 w-3" strokeWidth={1.75} />
        </a>
      </section>

      <MercadoPagoSetupChecklist
        clientIdPreview={
          readiness.fields.find((f) => f.key === "MP_CLIENT_ID")?.preview ?? null
        }
        redirectUri={readiness.redirectUri}
      />

      <section className="rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-6">
        <h2 className="text-[14px] font-semibold text-ink-0">Reglas de seguridad</h2>
        <ul className="mt-3 space-y-2 text-[12px] leading-[1.6] text-ink-5">
          <li>
            <span className="font-semibold text-ink-3">Secrets sólo en infraestructura.</span> <code>MP_CLIENT_SECRET</code> nunca se persiste en DB, nunca se imprime en UI, nunca se loguea completo.
          </li>
          <li>
            <span className="font-semibold text-ink-3">Tokens tenant cifrados.</span> Access y refresh token de cada tienda se guardan en <code>storePaymentProvider</code> cifrados con <code>ENCRYPTION_KEY</code>.
          </li>
          <li>
            <span className="font-semibold text-ink-3">Fail-closed.</span> Si falta una variable, el CTA de conexión desaparece para merchants y redirige a esta pantalla para ops.
          </li>
          <li>
            <span className="font-semibold text-ink-3">Sin super-admin en DB.</span> El acceso a esta pantalla se restringe por allowlist de email (<code>NEXORA_OPS_EMAILS</code>).
          </li>
        </ul>
      </section>

      <p className="text-[11px] text-ink-6">Último diagnóstico: {new Date(readiness.checkedAt).toLocaleString("es-AR")}</p>
    </div>
  );
}

function FieldRow({ field }: { field: MercadoPagoEnvFieldStatus }) {
  return (
    <li className="grid grid-cols-[24px_1fr_auto] items-start gap-3 py-3">
      <div className="mt-0.5">
        {field.present ? (
          <CheckCircle2 className="h-4 w-4 text-[color:var(--signal-success)]" strokeWidth={1.75} />
        ) : (
          <XCircle className="h-4 w-4 text-[color:var(--signal-danger)]" strokeWidth={1.75} />
        )}
      </div>
      <div>
        <p className="font-mono text-[12px] font-semibold text-ink-0">{field.label}</p>
        <p className="mt-1 text-[12px] leading-[1.55] text-ink-5">{field.description}</p>
        {field.preview ? (
          <p className="mt-1 font-mono text-[11px] text-ink-3">Valor actual: {field.preview}</p>
        ) : field.present ? (
          <p className="mt-1 font-mono text-[11px] text-ink-3">Cargado (valor oculto por seguridad)</p>
        ) : (
          <p className="mt-1 font-mono text-[11px] text-[color:var(--signal-warning)]">No configurado</p>
        )}
      </div>
      <span
        className={
          field.present
            ? "inline-flex shrink-0 items-center rounded-full border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[color:var(--signal-success)]"
            : "inline-flex shrink-0 items-center rounded-full border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[color:var(--signal-warning)]"
        }
      >
        {field.present ? "OK" : "Falta"}
      </span>
    </li>
  );
}

function ReadonlyField({
  label,
  value,
  hint,
  copyable,
}: {
  label: string;
  value: string;
  hint: string;
  copyable: boolean;
}) {
  return (
    <div className="rounded-[var(--r-sm)] border border-[color:var(--hairline)] bg-[var(--surface-1)] p-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-5">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        <code className="block flex-1 overflow-auto whitespace-nowrap font-mono text-[12px] text-ink-0">{value}</code>
        {copyable ? (
          <span
            aria-hidden
            className="inline-flex h-6 w-6 items-center justify-center rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-0)] text-ink-5"
            title="Copiable"
          >
            <Copy className="h-3 w-3" strokeWidth={1.75} />
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-[11px] leading-[1.55] text-ink-5">{hint}</p>
    </div>
  );
}
