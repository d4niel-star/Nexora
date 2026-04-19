// ─── Mercado Pago platform readiness ─────────────────────────────────────
// Single source of truth for "is Mercado Pago usable on this deployment?".
//
// Platform-global vs tenant split:
//   - Platform-global: MP_CLIENT_ID, MP_CLIENT_SECRET, NEXT_PUBLIC_APP_URL.
//     These are infra envs owned by Nexora ops. Without them, NO tenant can
//     initiate OAuth, regardless of how the UI looks.
//   - Tenant: the per-store StorePaymentProvider row (access token, refresh
//     token, status). Lives in DB, managed by the store owner via OAuth.
//
// This module strictly evaluates the platform-global layer. It never reads
// or exposes secret values — only their presence and a redacted preview of
// client_id (which is not secret by MP's own docs).

export type MercadoPagoEnvKey = "MP_CLIENT_ID" | "MP_CLIENT_SECRET" | "NEXT_PUBLIC_APP_URL";

export interface MercadoPagoEnvFieldStatus {
  key: MercadoPagoEnvKey;
  label: string;
  present: boolean;
  /** Non-secret preview; undefined when absent or when the field is a secret. */
  preview?: string;
  description: string;
}

export interface MercadoPagoPlatformReadiness {
  ready: boolean;
  canStartOAuth: boolean;
  missing: MercadoPagoEnvKey[];
  fields: MercadoPagoEnvFieldStatus[];
  redirectUri: string | null;
  checkedAt: string;
}

function nonEmpty(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function truncate(value: string, max = 8): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}

/**
 * Evaluates the presence of MP platform-global envs. Server-only callers
 * should use this instead of scattering their own `process.env` reads.
 *
 * Never invent a positive readiness: if any required env is missing we
 * return `ready: false` with the explicit list of missing keys.
 */
export function getMercadoPagoPlatformReadiness(): MercadoPagoPlatformReadiness {
  const clientIdRaw = process.env.MP_CLIENT_ID;
  const clientSecretRaw = process.env.MP_CLIENT_SECRET;
  const appUrlRaw = process.env.NEXT_PUBLIC_APP_URL;

  const hasClientId = nonEmpty(clientIdRaw);
  const hasClientSecret = nonEmpty(clientSecretRaw);
  const hasAppUrl = nonEmpty(appUrlRaw);

  const missing: MercadoPagoEnvKey[] = [];
  if (!hasClientId) missing.push("MP_CLIENT_ID");
  if (!hasClientSecret) missing.push("MP_CLIENT_SECRET");
  if (!hasAppUrl) missing.push("NEXT_PUBLIC_APP_URL");

  const ready = missing.length === 0;

  // Redirect URI is derived from NEXT_PUBLIC_APP_URL. When app URL is
  // missing, we cannot even describe where the callback would land.
  const redirectUri = hasAppUrl
    ? `${appUrlRaw!.replace(/\/$/, "")}/api/payments/mercadopago/oauth/callback`
    : null;

  const fields: MercadoPagoEnvFieldStatus[] = [
    {
      key: "MP_CLIENT_ID",
      label: "MP_CLIENT_ID",
      present: hasClientId,
      preview: hasClientId ? truncate(clientIdRaw!.trim()) : undefined,
      description:
        "Client ID de la aplicación Mercado Pago registrada a nivel plataforma. Obtenido desde el Developer Dashboard de MP.",
    },
    {
      key: "MP_CLIENT_SECRET",
      label: "MP_CLIENT_SECRET",
      present: hasClientSecret,
      // Secrets are never previewed, only presence is reported.
      description:
        "Secreto de la aplicación Mercado Pago. Nunca se muestra en la UI ni se loguea. Sólo se persiste como variable de entorno de infraestructura.",
    },
    {
      key: "NEXT_PUBLIC_APP_URL",
      label: "NEXT_PUBLIC_APP_URL",
      present: hasAppUrl,
      preview: hasAppUrl ? appUrlRaw!.replace(/\/$/, "") : undefined,
      description:
        "Origen público de Nexora. Se usa para construir el redirect_uri del OAuth de Mercado Pago; debe coincidir exactamente con la URL dada de alta en el Developer Dashboard de MP.",
    },
  ];

  return {
    ready,
    canStartOAuth: ready,
    missing,
    fields,
    redirectUri,
    checkedAt: new Date().toISOString(),
  };
}
