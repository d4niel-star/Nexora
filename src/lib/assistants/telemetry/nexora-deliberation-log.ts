// ─── Sanitized deliberation logging for SystemEvent / observability ─────
// Never log full user utterances. Trace details are trimmed + redacted.

import type { DeliberationMeta, TraceNote } from "@/lib/ai-core";

const MAX_DETAIL = 200;

function redactDetail(d: string): string {
  let s = d;
  s = s.replace(/norm="[^"]*"/g, 'norm="[redacted]"');
  s = s.replace(/"[^"]{50,}"/g, '"[redacted-long]"');
  if (s.length > MAX_DETAIL) s = `${s.slice(0, MAX_DETAIL - 1)}…`;
  return s;
}

export function sanitizeDeliberationTraceForStorage(
  trace: TraceNote[],
): Array<{ stage: string; detail: string }> {
  return trace.map((t) => ({
    stage: t.stage,
    detail: redactDetail(t.detail),
  }));
}

export function compactDeliberationMeta(meta: DeliberationMeta): Record<string, unknown> {
  return {
    assistant: meta.assistant,
    durationMs: meta.durationMs,
    messageLength: meta.messageLength,
    replyKind: meta.replyKind,
    resultIntent: meta.resultIntent,
    resultDomain: meta.resultDomain,
    pipeline: meta.pipeline,
    stageCount: meta.stages.length,
  };
}
