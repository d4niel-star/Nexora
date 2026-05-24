// ─── Promise Timeout ─────────────────────────────────────────────────
// Race a promise against a timer. If the timeout fires first, reject
// with TimeoutError; the original promise continues to run but its
// resolution is ignored. Use sparingly — long-running cancellations
// must be handled inside the operation itself (e.g. AbortController on
// fetch).

export class TimeoutError extends Error {
  timeoutMs: number;
  label: string;
  constructor(label: string, timeoutMs: number) {
    super(`Operation '${label}' timed out after ${timeoutMs}ms`);
    this.name = "TimeoutError";
    this.label = label;
    this.timeoutMs = timeoutMs;
  }
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label = "operation"): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(label, timeoutMs)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
