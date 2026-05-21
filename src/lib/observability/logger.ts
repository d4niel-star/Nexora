// ─── Structured System Logger (Phase 7A) ──────────────────────────────
// Thin re-export over `audit.ts` so we have a canonical import path for
// new code while keeping all existing `@/lib/observability/audit` imports
// working unchanged. Use either path interchangeably.
//
// `audit.ts` is the single source of truth for logSystemEvent and now
// supports the full 7A audit trail (actor, correlation, requestId, IP
// hash) plus metadata size capping.

import { logSystemEvent, type LogEventParams } from "./audit";

export type LogEventInput = LogEventParams;
export type Severity = "info" | "warn" | "error" | "critical";

export { logSystemEvent };

// ─── Severity-prefixed convenience wrappers ───
export const logInfo = (input: Omit<LogEventInput, "severity">) =>
  logSystemEvent({ ...input, severity: "info" });
export const logWarn = (input: Omit<LogEventInput, "severity">) =>
  logSystemEvent({ ...input, severity: "warn" });
export const logError = (input: Omit<LogEventInput, "severity">) =>
  logSystemEvent({ ...input, severity: "error" });
export const logCritical = (input: Omit<LogEventInput, "severity">) =>
  logSystemEvent({ ...input, severity: "critical" });
