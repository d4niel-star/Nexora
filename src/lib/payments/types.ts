// ─── Payment provider — view-model state ─────────────────────────────────
// Single, explicit state vocabulary every UI surface uses. The DB column
// `StorePaymentProvider.status` carries one of these strings; transient
// states (connecting, validating, disconnecting) live ONLY in client state
// and are mapped from React transitions / fetch promises. The UI MUST
// never derive a CTA label from booleans alone — always from this state.

import type { PaymentProviderId } from "./registry";

export type PaymentProviderStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "validating"
  | "needs_reconnection"
  | "error"
  | "disconnecting";

export interface PaymentProviderConnectionView {
  provider: PaymentProviderId | string;
  status: PaymentProviderStatus;
  externalAccountId: string | null;
  accountEmail: string | null;
  publicKey: string | null;
  connectedAt: string | null;
  lastValidatedAt: string | null;
  lastError: string | null;
  /** Non-secret extras parsed from `configJson` for UI consumption. */
  config: Record<string, unknown>;
}

export interface PaymentProviderValidationResult {
  ok: boolean;
  provider: PaymentProviderId | string;
  validatedAt: string;
  /** Free-form message shown to the merchant after a validation attempt. */
  message: string;
  /**
   * Some providers cannot be validated automatically (no public ping
   * endpoint, contractual sandbox unavailable). When that is the case,
   * we set this to true and surface an honest message to the merchant.
   */
  manual?: boolean;
}

export interface PaymentProviderConnectInput {
  provider: PaymentProviderId | string;
  /** Free-form credentials the registry's credentialFields define. */
  credentials: Record<string, string>;
  /** Optional non-secret extras (environment, account label, etc.). */
  config?: Record<string, unknown>;
}

export interface PaymentProviderDisconnectInput {
  provider: PaymentProviderId | string;
}

export interface PaymentProviderActionResult {
  ok: boolean;
  message: string;
  status?: PaymentProviderStatus;
  validation?: PaymentProviderValidationResult;
}
