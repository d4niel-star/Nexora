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

/** Stable error codes shared by every carrier adapter call. */
export type CarrierErrorCode =
  | "invalid_credentials"
  | "missing_field"
  | "ip_blocked"
  | "rate_limited"
  | "carrier_unavailable"
  | "unexpected_response"
  | "network_error"
  | "not_supported"
  | "not_connected";

/** Result of a credential validation round-trip against the live carrier API. */
export type CarrierValidationResult =
  | {
      ok: true;
      metadata: CarrierAccountMetadata;
    }
  | {
      ok: false;
      code: CarrierErrorCode;
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

// ─── Capability matrix ────────────────────────────────────────────────────
// Declarative description of what each carrier can actually do, so the UI
// can decide which buttons / panels to render and the operations layer
// can fail closed when a verb isn't supported by a given provider.
export interface CarrierCapabilities {
  validateCredentials: boolean;
  quoteShipment: boolean;
  createShipment: boolean;
  /** Whether the carrier's API returns a downloadable PDF label. */
  labelPdf: boolean;
  getTracking: boolean;
  /** Public, unauthenticated tracking endpoint (skip merchant credentials). */
  publicTracking: boolean;
}

// ─── Shipment shape ────────────────────────────────────────────────────────
// Shared, carrier-agnostic representation of a shipment used by the
// quote/create/track flows. Adapters map this to/from their wire format.
export interface ShipmentParty {
  name: string;
  email: string;
  phone?: string | null;
  document?: string | null;
  postalCode: string;
  street?: string | null;
  streetNumber?: string | null;
  floor?: string | null;
  apartment?: string | null;
  city?: string | null;
  province?: string | null; // free-text province name
  /** Carrier-specific province code (e.g. "C" for CABA, "B" for PBA). */
  provinceCode?: string | null;
  country?: string | null;
}

export interface ShipmentPackage {
  weightG: number;
  heightCm: number;
  widthCm: number;
  lengthCm: number;
  declaredValue?: number | null;
}

/** "D" = entrega a domicilio · "S" = entrega a sucursal. */
export type ShipmentDeliveryType = "home" | "branch";

export interface QuoteShipmentInput {
  origin: ShipmentParty;
  destination: ShipmentParty;
  package: ShipmentPackage;
  /** When `branch`, requires `branchCode` for some carriers. */
  deliveryType: ShipmentDeliveryType;
  branchCode?: string | null;
}

export interface QuoteRate {
  carrierId: CarrierId;
  serviceCode: string;
  serviceName: string;
  amount: number;
  currency: string;
  estimatedDaysMin?: number;
  estimatedDaysMax?: number;
  deliveryType: ShipmentDeliveryType;
  validUntil?: string | null;
}

export type QuoteShipmentResult =
  | { ok: true; rates: QuoteRate[] }
  | { ok: false; code: CarrierErrorCode; message: string };

export interface CreateShipmentInput extends QuoteShipmentInput {
  externalOrderId: string;
  orderNumber?: string;
  /** Optional service code returned by quoteShipment (carrier-specific). */
  serviceCode?: string | null;
}

export type CreateShipmentResult =
  | {
      ok: true;
      externalShipmentId: string | null;
      trackingNumber: string | null;
      trackingUrl: string | null;
      labelUrl: string | null;
      status: string;
      raw: unknown;
    }
  | { ok: false; code: CarrierErrorCode; message: string };

export interface TrackingEvent {
  /** ISO8601 timestamp. */
  occurredAt: string;
  status: string;
  description?: string | null;
  location?: string | null;
}

export type TrackingResult =
  | {
      ok: true;
      trackingNumber: string;
      status: string;
      events: TrackingEvent[];
      lastUpdate?: string | null;
      raw: unknown;
    }
  | { ok: false; code: CarrierErrorCode; message: string };

/**
 * Per-carrier integration adapter. Today every adapter owns:
 *   • `validateCredentials` (always)
 *   • Whatever subset of (quote, create, label, track) is exposed by the
 *     real carrier API. Unsupported verbs are simply absent: the
 *     `capabilities` object is the source of truth.
 */
export interface CarrierAdapter {
  readonly id: CarrierId;
  readonly capabilities: CarrierCapabilities;

  validateCredentials(input: CarrierCredentialsInput): Promise<CarrierValidationResult>;

  quoteShipment?(
    auth: CarrierAuthContext,
    input: QuoteShipmentInput,
  ): Promise<QuoteShipmentResult>;

  createShipment?(
    auth: CarrierAuthContext,
    input: CreateShipmentInput,
  ): Promise<CreateShipmentResult>;

  getTracking?(
    auth: CarrierAuthContext,
    trackingNumber: string,
  ): Promise<TrackingResult>;

  /** Returns the raw label PDF bytes when supported. */
  getLabelPdf?(
    auth: CarrierAuthContext,
    externalShipmentId: string,
  ): Promise<{ ok: true; pdf: Uint8Array } | { ok: false; code: CarrierErrorCode; message: string }>;
}

/**
 * Authentication context handed to every operation verb. Carries the
 * merchant credentials already decrypted from the vault, the chosen
 * environment, and any carrier-specific extras pulled from
 * `StoreCarrierConnection.configJson` (e.g. Andreani `contractNumber`).
 */
export interface CarrierAuthContext {
  username: string;
  password: string;
  clientNumber: string | null;
  environment: CarrierEnvironment;
  /** Free-form, carrier-specific configuration (parsed from configJson). */
  config: Record<string, unknown>;
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
  /** Parsed configJson — non-secret carrier extras (e.g. contractNumber). */
  config: Record<string, unknown>;
}
