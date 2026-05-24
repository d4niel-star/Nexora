// ─── Job Types & Handler Registry ─────────────────────────────────────
// Centralized list of all job types Nexora knows how to run. Adding a
// new job type requires:
//   1. Adding the literal here.
//   2. Registering a handler via registerJobHandler().
//   3. Producing the job with enqueueJob({ type, payload, ... }).
//
// We keep this string-based (not enum) because Job.type is a free string
// at the DB level — strict literals here keep TS honest while letting
// historical jobs with deprecated types still load.

export const JOB_TYPES = [
  "review_request",
  "abandoned_cart_email",
  "stock_alert",
  "csv_export",
  "automation_run",
  "webhook_redelivery",
  // ─── Phase 7B: Automation queue migration ───
  "automation.abandoned_cart",
  "automation.dunning",
  "automation.review_request",
  "automation.pickup_expiration",
  "automation.low_stock",
] as const;

export type JobType = (typeof JOB_TYPES)[number];

export interface JobHandlerContext {
  jobId: string;
  type: string;
  storeId: string | null;
  payload: Record<string, unknown>;
  attempts: number;
  correlationId: string | null;
}

export interface JobHandlerResult {
  // If error is set, the runner treats this as a failure and applies the
  // retry policy. Otherwise the job is marked succeeded.
  ok: boolean;
  error?: string;
  // When true, the runner will mark the job as `dead` (no retries) on
  // top of the failure — used for validation errors that won't be
  // resolved by retrying (e.g. missing storeId, malformed payload).
  permanent?: boolean;
  // Optional: free-form metadata persisted onto the job's metadataJson
  // for observability.
  metadata?: Record<string, unknown>;
}

export type JobHandler = (ctx: JobHandlerContext) => Promise<JobHandlerResult>;

// ─── Permanent (non-retryable) error ───
// Throw this from inside a handler when the failure is structural and
// retrying will not help (validation errors, missing required entity,
// etc.). The runner catches it, marks the job dead, and skips backoff.
export class PermanentJobError extends Error {
  permanent = true as const;
  constructor(message: string) {
    super(message);
    this.name = "PermanentJobError";
  }
}

// ─── Per-type timeout config ───
// Defaults to 60s (Phase 7B.5). Override per type when the job is known
// to legitimately take longer (e.g. CSV exports). The runner enforces
// this via `withTimeout`.
const DEFAULT_TIMEOUT_MS = 60_000;

const JOB_TIMEOUTS: Record<string, number> = {
  csv_export: 5 * 60_000, // 5 minutes — bulk exports legitimately take time
  // Automations are individually small (per-store fan-out happens via
  // many enqueued jobs), so 60s is plenty.
};

export function getJobTimeoutMs(type: string): number {
  return JOB_TIMEOUTS[type] ?? DEFAULT_TIMEOUT_MS;
}

// ─── Handler Registry ───
// Workers call registerJobHandler() at module load. Runners call
// resolveJobHandler() to dispatch.
const REGISTRY = new Map<string, JobHandler>();

export function registerJobHandler(type: string, handler: JobHandler): void {
  REGISTRY.set(type, handler);
}

export function resolveJobHandler(type: string): JobHandler | undefined {
  return REGISTRY.get(type);
}

export function listRegisteredJobTypes(): string[] {
  return Array.from(REGISTRY.keys()).sort();
}
