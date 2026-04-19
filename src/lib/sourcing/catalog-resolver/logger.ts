import type { DiagnosticStep } from "./types";

// ─── Diagnostics collector ───────────────────────────────────────────────
// Every step the resolver takes is appended here and returned with the
// preview so operators can see, step by step, what happened. This is the
// "explain why this URL gave N products" surface.

export class ResolverLogger {
  private readonly steps: DiagnosticStep[] = [];
  constructor(private readonly startedAt: number = Date.now()) {}

  log(
    step: string,
    status: DiagnosticStep["status"],
    message: string,
    detail?: Record<string, unknown>,
  ): void {
    this.steps.push({
      step,
      status,
      message,
      detail,
      elapsedMs: Date.now() - this.startedAt,
    });
  }

  ok(step: string, message: string, detail?: Record<string, unknown>) {
    this.log(step, "ok", message, detail);
  }
  info(step: string, message: string, detail?: Record<string, unknown>) {
    this.log(step, "info", message, detail);
  }
  warn(step: string, message: string, detail?: Record<string, unknown>) {
    this.log(step, "warn", message, detail);
  }
  error(step: string, message: string, detail?: Record<string, unknown>) {
    this.log(step, "error", message, detail);
  }

  all(): DiagnosticStep[] {
    return [...this.steps];
  }
}
