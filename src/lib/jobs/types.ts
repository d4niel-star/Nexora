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
  // Optional: free-form metadata persisted onto the job's metadataJson
  // for observability.
  metadata?: Record<string, unknown>;
}

export type JobHandler = (ctx: JobHandlerContext) => Promise<JobHandlerResult>;

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
