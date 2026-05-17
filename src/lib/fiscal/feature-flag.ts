// ─── Fiscal / ARCA feature flag ─────────────────────────────────────────
//
// Single source of truth for whether Nexora is allowed to issue real
// fiscal documents. Today the ARCA integration ships as a *mock* (see
// `src/lib/fiscal/arca/services.ts` → `mockArcaWebServiceCall`) so the
// product MUST NOT present anything that comes out of it as a real CAE.
//
// Enable real emission ONLY when both conditions are met:
//   1. `ARCA_REAL_INTEGRATION === "true"` is set in the environment.
//   2. A real AFIP/ARCA WebService adapter has replaced the mock.
//
// Every fiscal-emitting code path checks this flag *first* and refuses
// to run when it is off. Existing FiscalInvoice rows in the DB are NOT
// rewritten or deleted — they remain in place as historical artifacts
// of the testing-mode era.

export const FISCAL_FEATURE_FLAG_ENV = "ARCA_REAL_INTEGRATION";

export function isRealFiscalIntegrationEnabled(): boolean {
  return process.env[FISCAL_FEATURE_FLAG_ENV] === "true";
}

/**
 * Stable error code so server actions / route handlers / UI controls
 * can render a consistent "fiscal disabled" message without string
 * matching against free-text exceptions.
 */
export const FISCAL_DISABLED_ERROR_CODE = "fiscal_real_integration_disabled";

export class FiscalRealIntegrationDisabledError extends Error {
  readonly code = FISCAL_DISABLED_ERROR_CODE;
  constructor(action: string) {
    super(
      `[fiscal] Refusing to ${action}: ARCA real integration is disabled. ` +
        `Set ${FISCAL_FEATURE_FLAG_ENV}=true and replace the mock service before enabling fiscal flows.`,
    );
    this.name = "FiscalRealIntegrationDisabledError";
  }
}
