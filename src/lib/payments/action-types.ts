// ─── Action input/result types — shared between server actions and the
// admin UI. Lives in a separate file because `actions.ts` is `use server`
// and Next.js requires that module to expose only async functions.

import type {
  PaymentProviderActionResult,
  PaymentProviderConnectInput,
  PaymentProviderDisconnectInput,
} from "./types";

export type ConnectProviderInput = PaymentProviderConnectInput;
export type DisconnectProviderInput = PaymentProviderDisconnectInput;

export interface ValidateProviderInput {
  provider: string;
}

export type AdminPaymentActionResult = PaymentProviderActionResult;
