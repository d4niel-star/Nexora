// ─── Carrier integration types ─────────────────────────────────────────────
// Shared contracts for the merchant-facing shipping integrations exposed
// under /admin/shipping. Each supported carrier (Correo Argentino,
// Andreani) plugs into the same surface via a CarrierAdapter, and a
// single Prisma table (StoreCarrierConnection) persists the per-store
// state. See lib/shipping/registry.ts for the carrier metadata catalog.

/** Discriminator for the carrier provider. Mirrors `StoreCarrierConnection.carrier`. */
export type CarrierId = "correo_argentino" | "andreani";

/** Lifecycle of a per-store carrier connection. Mirrors `StoreCarrierConnection.status`. */
export type CarrierConnectionStatus =
  | "disconnected"
  | "connected"
  | "error"
  | "needs_reconnection";

/** API environment selected by the merchant when linking the account. */
export type CarrierEnvironment = "production" | "sandbox";

/**
 * Free-form metadata returned by the carrier API when validation succeeds.
 * Surfaced to the UI so the merchant can confirm the linked account.
 */
export interface CarrierAccountMetadata {
  externalAccountId?: string | null;
  displayName?: string | null;
}

/** Result of a credential validation round-trip against the live carrier API. */
export type CarrierValidationResult =
  | {
      ok: true;
      metadata: CarrierAccountMetadata;
    }
  | {
      ok: false;
      /** Stable machine code for telemetry. */
      code:
        | "invalid_credentials"
        | "missing_field"
        | "ip_blocked"
        | "rate_limited"
        | "carrier_unavailable"
        | "unexpected_response"
        | "network_error";
      /** Human-readable Spanish message ready for the UI. */
      message: string;
    };

/** Inputs accepted by every CarrierAdapter.validate() implementation. */
export interface CarrierCredentialsInput {
  username: string;
  password: string;
  clientNumber?: string | null;
  environment: CarrierEnvironment;
}

/**
 * Per-carrier integration adapter. Today every adapter only owns the
 * authentication round-trip; future verbs (rate, label, track) will be
 * added to this interface so the persistence layer doesn't change.
 */
export interface CarrierAdapter {
  readonly id: CarrierId;
  validateCredentials(input: CarrierCredentialsInput): Promise<CarrierValidationResult>;
}

/** Snapshot of a carrier connection ready for the UI. Never includes secrets. */
export interface CarrierConnectionSummary {
  carrier: CarrierId;
  status: CarrierConnectionStatus;
  environment: CarrierEnvironment;
  accountUsername: string | null;
  accountClientNumber: string | null;
  accountDisplayName: string | null;
  externalAccountId: string | null;
  hasStoredPassword: boolean;
  lastError: string | null;
  connectedAt: string | null;
  lastValidatedAt: string | null;
}
