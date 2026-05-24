import { logSystemEvent } from "@/lib/observability/audit";

// ─── In-Memory Circuit Breaker ───────────────────────────────────────
// Lightweight per-process circuit breaker to protect downstream
// providers (email, payments, external APIs).
//
// States:
//   - closed:    requests flow through; failures are counted
//   - open:      requests fail fast for `cooldownMs`
//   - half_open: a single trial request decides whether to close again
//
// Why per-process and not DB-backed? Cross-process coordination would
// require a Postgres row + lock per request which would defeat the
// purpose (saving downstream load). The trade-off is each Node worker
// has its own breaker — acceptable for small/medium fleets. When we
// scale horizontally beyond ~4 workers we should swap to a shared
// store (Redis or a Postgres counter with NOTIFY).
//
// We DO emit SystemEvents on every state transition so operators can
// see the failure pattern in /admin/operations/timeline.

export interface CircuitBreakerOptions {
  /** Friendly name — appears in audit logs and health reports. */
  name: string;
  /** Consecutive failures that trip the breaker. Default 5. */
  failureThreshold?: number;
  /** How long the breaker stays open before going half-open. Default 60s. */
  cooldownMs?: number;
  /** Half-open: how many successes to fully close. Default 1. */
  halfOpenSuccessThreshold?: number;
}

type State = "closed" | "open" | "half_open";

interface BreakerSnapshot {
  name: string;
  state: State;
  failures: number;
  successesInHalfOpen: number;
  openedAt: number | null;
  lastFailureAt: number | null;
}

const breakers = new Map<string, CircuitBreaker>();

export class CircuitBreakerOpenError extends Error {
  breaker: string;
  retryAfterMs: number;
  constructor(name: string, retryAfterMs: number) {
    super(`Circuit breaker '${name}' is open; retry in ~${Math.ceil(retryAfterMs / 1000)}s`);
    this.name = "CircuitBreakerOpenError";
    this.breaker = name;
    this.retryAfterMs = retryAfterMs;
  }
}

class CircuitBreaker {
  readonly name: string;
  readonly failureThreshold: number;
  readonly cooldownMs: number;
  readonly halfOpenSuccessThreshold: number;

  private state: State = "closed";
  private failures = 0;
  private successesInHalfOpen = 0;
  private openedAt: number | null = null;
  private lastFailureAt: number | null = null;

  constructor(opts: CircuitBreakerOptions) {
    this.name = opts.name;
    this.failureThreshold = opts.failureThreshold ?? 5;
    this.cooldownMs = opts.cooldownMs ?? 60_000;
    this.halfOpenSuccessThreshold = opts.halfOpenSuccessThreshold ?? 1;
  }

  snapshot(): BreakerSnapshot {
    // Lazy state recalc — open might be ready to transition to half-open
    this.maybeTransitionFromOpen();
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      successesInHalfOpen: this.successesInHalfOpen,
      openedAt: this.openedAt,
      lastFailureAt: this.lastFailureAt,
    };
  }

  private maybeTransitionFromOpen() {
    if (this.state === "open" && this.openedAt !== null && Date.now() - this.openedAt >= this.cooldownMs) {
      this.state = "half_open";
      this.successesInHalfOpen = 0;
      // Audit-log asynchronously; never block business logic.
      void logSystemEvent({
        entityType: "circuit_breaker",
        entityId: this.name,
        eventType: "circuit_breaker_half_open",
        severity: "info",
        source: "resilience",
        message: `Circuit '${this.name}' transitioned to half-open`,
      });
    }
  }

  async exec<T>(operation: () => Promise<T>): Promise<T> {
    this.maybeTransitionFromOpen();

    if (this.state === "open") {
      const elapsed = this.openedAt ? Date.now() - this.openedAt : 0;
      throw new CircuitBreakerOpenError(this.name, Math.max(0, this.cooldownMs - elapsed));
    }

    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (err) {
      this.recordFailure();
      throw err;
    }
  }

  private recordSuccess() {
    if (this.state === "half_open") {
      this.successesInHalfOpen += 1;
      if (this.successesInHalfOpen >= this.halfOpenSuccessThreshold) {
        this.state = "closed";
        this.failures = 0;
        this.openedAt = null;
        this.successesInHalfOpen = 0;
        void logSystemEvent({
          entityType: "circuit_breaker",
          entityId: this.name,
          eventType: "circuit_breaker_closed",
          severity: "info",
          source: "resilience",
          message: `Circuit '${this.name}' recovered (closed)`,
        });
      }
    } else if (this.state === "closed") {
      // Successful run resets failure streak (no transition needed).
      this.failures = 0;
    }
  }

  private recordFailure() {
    this.lastFailureAt = Date.now();

    if (this.state === "half_open") {
      // Trial failed — reopen.
      this.openedAt = Date.now();
      this.state = "open";
      this.successesInHalfOpen = 0;
      void logSystemEvent({
        entityType: "circuit_breaker",
        entityId: this.name,
        eventType: "circuit_breaker_reopened",
        severity: "warn",
        source: "resilience",
        message: `Circuit '${this.name}' reopened after half-open trial failed`,
      });
      return;
    }

    if (this.state === "closed") {
      this.failures += 1;
      if (this.failures >= this.failureThreshold) {
        this.state = "open";
        this.openedAt = Date.now();
        void logSystemEvent({
          entityType: "circuit_breaker",
          entityId: this.name,
          eventType: "circuit_breaker_opened",
          severity: "error",
          source: "resilience",
          message: `Circuit '${this.name}' opened after ${this.failures} consecutive failures`,
          metadata: { failureThreshold: this.failureThreshold, cooldownMs: this.cooldownMs },
        });
      }
    }
  }
}

export function getCircuitBreaker(opts: CircuitBreakerOptions): CircuitBreaker {
  let breaker = breakers.get(opts.name);
  if (!breaker) {
    breaker = new CircuitBreaker(opts);
    breakers.set(opts.name, breaker);
  }
  return breaker;
}

/** Snapshot of every breaker — used by the health report. */
export function snapshotAllBreakers(): BreakerSnapshot[] {
  return Array.from(breakers.values()).map((b) => b.snapshot());
}
