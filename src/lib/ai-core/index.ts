// ─── Nexora AI Core — public surface ────────────────────────────────────
//
// Both the Global Assistant (admin) and the Store Editor Assistant import
// from here. Anything that is per-assistant (intent catalog, dispatcher,
// undo behavior) lives in their own folder, never in the core.

export * from "./types";
export { normalize, hasAny, hasAnyWord, tokens } from "./normalize";
export { detectTone } from "./tone";
export { classifyMessage } from "./classifier";
export {
  interpret,
  interpretWithFloor,
  type ConceptIntent,
  type InterpretResult,
} from "./interpreter";
export { compose, pickSocialReply } from "./composer";
export {
  deliberate,
  type AssistantAdapter,
  type DomainPlan,
  type DeliberationOutcome,
  type TraceNote,
  type TraceStage,
} from "./deliberate";
