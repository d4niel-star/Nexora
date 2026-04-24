// ─── Nexora AI Core — Deliberation Layer ────────────────────────────────
//
// Single conversational pipeline shared by the Global Assistant and the
// Store Editor Assistant. Internal stages (never exposed to the user as a
// raw chain-of-thought):
//
//   1. INTAKE       — normalize, classify, detect tone, sanity-check input
//   2. RETRIEVAL    — pull recent context, last intent, surface (route)
//   3. PLAN         — let the assistant interpret the message into a
//                     domain plan (intent + entities + confidence)
//   4. VERIFY       — confirm the plan is safe/coherent (handoff?
//                     ambiguous? destructive without target? out of scope?)
//   5. EXECUTE      — dispatch to the assistant's domain executor
//                     (or short-circuit with smalltalk/help/clarify)
//   6. POST-CHECK   — update conversation context, derive follow-up hints
//
// The output is always a `DeliberationOutcome` with:
//   - `reply`   : adaptive Reply ready to render
//   - `context` : updated CoreContext to persist
//   - `trace`   : structured internal notes (debug-only; never rendered)
//
// Important design rules:
//   · The pipeline is sync where possible to stay snappy; only the
//     `dispatch` step is async (it can hit server actions).
//   · "Deliberation" is real: ambiguity, conflict and out-of-scope checks
//     run BEFORE execution. Impulsive single-match dispatch is forbidden.
//   · We never expose the trace to the UI. It exists for tests and audit.

import { classifyMessage } from "./classifier";
import { compose, pickSocialReply } from "./composer";
import { detectTone } from "./tone";
import { normalize } from "./normalize";
import {
  pushTurn,
  type CoreContext,
  type Reply,
  type ToneProfile,
} from "./types";

// ─── Domain plan ────────────────────────────────────────────────────────

export interface DomainPlan<TIntentId extends string = string> {
  intent: TIntentId | null;
  /** 0..1 — confidence in the chosen intent. */
  confidence: number;
  /** Free-form entities for the dispatcher. */
  entities?: Record<string, unknown>;
  /** Optional human-readable reason if the planner can't decide. */
  needsClarification?: string;
  /** Optional handoff hint: this assistant won't run it (the other one should). */
  handoffTo?: "global" | "editor";
  /** Optional warning the verifier may surface to the user. */
  warning?: string;
  /** Raw text the planner received (post-normalize is fine too). */
  rawText?: string;
}

// ─── Assistant adapter ──────────────────────────────────────────────────
//
// Each assistant implements this shape. The adapter is the ONLY surface
// the deliberation layer talks to per assistant. This is what enables a
// single shared brain to power two truly distinct assistants.

export interface AssistantAdapter<TIntentId extends string = string> {
  id: "global" | "editor";
  /** Friendly name for traces/help. */
  label: string;
  /**
   * Interpret a user message into a domain plan. The assistant uses its
   * own vocabulary / engine here. Should be pure (no side effects).
   */
  interpret(raw: string, ctx: CoreContext, tone: ToneProfile): DomainPlan<TIntentId>;
  /**
   * Execute a verified plan. May call server actions, mutate state, etc.
   * Must return a Reply that's already adapted to the tone.
   */
  dispatch(
    plan: DomainPlan<TIntentId>,
    ctx: CoreContext,
    tone: ToneProfile,
  ): Promise<Reply>;
  /** Help reply, tone-adapted. */
  help(tone: ToneProfile): Reply;
  /** Optional: business-status reply (default: generic). */
  status?(tone: ToneProfile, ctx: CoreContext): Reply;
  /**
   * Optional verifier hook. Called after `interpret` and before `dispatch`.
   * Return:
   *   - the plan unchanged to proceed
   *   - a modified plan (e.g., add a warning, route to handoff)
   *   - a Reply to short-circuit (e.g., refuse, ask, deny)
   */
  verify?(
    plan: DomainPlan<TIntentId>,
    ctx: CoreContext,
    tone: ToneProfile,
  ): DomainPlan<TIntentId> | Reply;
  /**
   * Optional follow-up resolver. When the classifier flags a follow-up
   * ("eso no", "el anterior", "deshacer"), the assistant decides what
   * to do with it. Default: re-run the last intent if any.
   */
  resolveFollowUp?(
    raw: string,
    ctx: CoreContext,
    tone: ToneProfile,
  ): DomainPlan<TIntentId> | Reply | null;
  /**
   * Optional smalltalk flavor. Default: core's `pickSocialReply`.
   */
  smalltalk?(hint: string | undefined, tone: ToneProfile): Reply;
}

// ─── Outcome ────────────────────────────────────────────────────────────

export type TraceStage =
  | "intake"
  | "retrieval"
  | "social"
  | "smalltalk"
  | "help"
  | "status"
  | "follow_up"
  | "plan"
  | "verify"
  | "handoff"
  | "ambiguous"
  | "out_of_scope"
  | "execute"
  | "noop"
  | "error";

export interface TraceNote {
  stage: TraceStage;
  detail: string;
  data?: Record<string, unknown>;
}

export interface DeliberationOutcome {
  reply: Reply;
  context: CoreContext;
  /** Internal-only. NEVER render this to the user. */
  trace: TraceNote[];
}

// ─── Pipeline ───────────────────────────────────────────────────────────

export async function deliberate<TIntentId extends string>(
  raw: string,
  adapter: AssistantAdapter<TIntentId>,
  ctx: CoreContext,
): Promise<DeliberationOutcome> {
  const trace: TraceNote[] = [];
  const note = (stage: TraceStage, detail: string, data?: Record<string, unknown>) =>
    trace.push({ stage, detail, data });

  // ── 1. INTAKE ───────────────────────────────────────────────────
  const text = raw.trim();
  if (!text) {
    const reply = compose({
      kind: "ask",
      tone: detectTone(""),
      text: "¿En qué te ayudo?",
    });
    return finalize(reply, ctx, raw, "noop", trace);
  }

  const tone = detectTone(text);
  const cls = classifyMessage(text);
  const norm = normalize(text);
  note("intake", `cls=${cls.category} conf=${cls.confidence.toFixed(2)} reg=${tone.register} brev=${tone.brevity} mood=${tone.mood}`);

  // ── 2. RETRIEVAL ────────────────────────────────────────────────
  const recent = ctx.history.slice(-4);
  note("retrieval", `lastIntent=${ctx.lastIntent ?? "∅"} domain=${ctx.lastDomain ?? "∅"} route=${ctx.currentRoute} turns=${recent.length}`);

  // ── 3a. SHORT-CIRCUITS — social / smalltalk / help / status ─────
  if (cls.category === "social") {
    const reply =
      adapter.smalltalk?.(cls.hint, tone) ??
      compose({ kind: "smalltalk", tone, text: pickSocialReply(cls.hint, tone) });
    note("social", cls.hint ?? "greeting");
    return finalize(reply, ctx, raw, "social", trace);
  }
  if (cls.category === "smalltalk") {
    const reply =
      adapter.smalltalk?.("smalltalk", tone) ??
      compose({
        kind: "smalltalk",
        tone,
        text:
          tone.register === "casual"
            ? "Todo bien por acá. ¿Qué necesitás?"
            : "Todo en orden. ¿En qué te ayudo?",
      });
    note("smalltalk", "generic");
    return finalize(reply, ctx, raw, "social", trace);
  }
  if (cls.category === "ask_help") {
    const reply = adapter.help(tone);
    note("help", adapter.label);
    return finalize(reply, ctx, raw, "help", trace);
  }
  if (cls.category === "ask_status" && adapter.status) {
    const reply = adapter.status(tone, ctx);
    note("status", adapter.label);
    return finalize(reply, ctx, raw, "status", trace);
  }

  // ── 3b. FOLLOW-UP ────────────────────────────────────────────────
  if (cls.category === "follow_up") {
    note("follow_up", `lastIntent=${ctx.lastIntent ?? "∅"}`);
    const fallback = adapter.resolveFollowUp?.(raw, ctx, tone) ?? defaultFollowUp(ctx);
    if (fallback === null) {
      const reply = compose({
        kind: "ask",
        tone,
        text:
          tone.register === "casual"
            ? "Decime un poco más a qué te referís."
            : "¿Podés darme un poco más de contexto?",
      });
      return finalize(reply, ctx, raw, "noop", trace);
    }
    if (isReply(fallback)) {
      return finalize(fallback, ctx, raw, ctx.lastIntent ?? "follow_up", trace);
    }
    // It's a plan — fall through to verify+execute
    const plan = fallback as DomainPlan<TIntentId>;
    return runPlan(plan, adapter, ctx, tone, raw, trace, note);
  }

  // ── 4. PLAN — let the assistant interpret ───────────────────────
  const plan = adapter.interpret(text, ctx, tone);
  note("plan", `intent=${plan.intent ?? "∅"} conf=${plan.confidence.toFixed(2)}`, {
    handoffTo: plan.handoffTo,
    needsClarification: plan.needsClarification,
  });

  // 4a. Ambiguity gate — confidence too low and no clarification path
  if (!plan.intent && !plan.needsClarification) {
    note("ambiguous", `norm="${norm}"`);
    const reply = compose({
      kind: "ask",
      tone,
      text:
        tone.register === "casual"
          ? "Mmm, no me cerró del todo. ¿Lo decís de otra forma?"
          : "No terminé de entender. ¿Podés reformular con un poco más de detalle?",
      nextSteps: ["Probá ser más concreto", "Decime el módulo o la sección"],
    });
    return finalize(reply, ctx, raw, "ambiguous", trace);
  }

  // 4b. Explicit clarification request from interpreter
  if (plan.needsClarification) {
    const reply = compose({
      kind: "ask",
      tone,
      text: plan.needsClarification,
    });
    return finalize(reply, ctx, raw, "noop", trace);
  }

  return runPlan(plan, adapter, ctx, tone, raw, trace, note);
}

// ─── Verify + Execute path ──────────────────────────────────────────────

async function runPlan<TIntentId extends string>(
  plan: DomainPlan<TIntentId>,
  adapter: AssistantAdapter<TIntentId>,
  ctx: CoreContext,
  tone: ToneProfile,
  raw: string,
  trace: TraceNote[],
  note: (stage: TraceStage, detail: string, data?: Record<string, unknown>) => void,
): Promise<DeliberationOutcome> {
  // ── 4c. Custom verifier ─────────────────────────────────────────
  let verified: DomainPlan<TIntentId> | Reply = plan;
  if (adapter.verify) {
    verified = adapter.verify(plan, ctx, tone);
  }

  if (isReply(verified)) {
    note("verify", "short-circuited by adapter");
    return finalize(verified, ctx, raw, plan.intent ?? "noop", trace);
  }

  const finalPlan = verified;

  // ── 4d. Handoff guard ───────────────────────────────────────────
  if (finalPlan.handoffTo && finalPlan.handoffTo !== adapter.id) {
    note("handoff", `to=${finalPlan.handoffTo}`);
    // We don't actually invoke the other assistant here; we let its
    // dispatcher render the handoff message (assistants own how to
    // explain a handoff in their voice).
  }

  if (finalPlan.warning) {
    note("verify", `warning="${finalPlan.warning}"`);
  }

  // ── 5. EXECUTE ───────────────────────────────────────────────────
  let reply: Reply;
  try {
    reply = await adapter.dispatch(finalPlan, ctx, tone);
    note("execute", `ok intent=${finalPlan.intent ?? "∅"} kind=${reply.kind}`);
  } catch (e) {
    const msg = (e as Error).message ?? "Error desconocido";
    note("error", msg);
    reply = compose({
      kind: "err",
      tone,
      text: `Hubo un problema ejecutando esa acción: ${msg}`,
    });
  }

  return finalize(reply, ctx, raw, finalPlan.intent ?? "noop", trace);
}

// ─── Helpers ────────────────────────────────────────────────────────────

function defaultFollowUp(ctx: CoreContext): null | DomainPlan {
  if (!ctx.lastIntent) return null;
  return { intent: ctx.lastIntent, confidence: 0.6, rawText: "(follow-up)" };
}

function isReply(x: unknown): x is Reply {
  return (
    typeof x === "object" &&
    x !== null &&
    typeof (x as Reply).kind === "string" &&
    typeof (x as Reply).text === "string"
  );
}

function finalize(
  reply: Reply,
  ctx: CoreContext,
  raw: string,
  intent: string,
  trace: TraceNote[],
): DeliberationOutcome {
  let next = pushTurn(ctx, { role: "user", text: raw, ts: Date.now() });
  next = pushTurn(next, {
    role: "assistant",
    text: reply.text,
    ts: Date.now(),
  });
  if (intent !== "noop" && intent !== "social") {
    next = { ...next, lastIntent: intent, lastDomain: domainOf(intent) };
  }
  return { reply: { ...reply, newContext: next }, context: next, trace };
}

function domainOf(intent: string): string {
  if (intent.startsWith("ads.")) return "ads";
  if (intent.startsWith("nav.")) return "navigation";
  if (intent.startsWith("status.")) return "status";
  if (intent.startsWith("editor.")) return "editor";
  if (intent.startsWith("design.")) return "design";
  if (intent.startsWith("layout.")) return "layout";
  if (intent.startsWith("hero.")) return "hero";
  if (intent.startsWith("brand.")) return "brand";
  if (intent.startsWith("preview.")) return "preview";
  if (intent.startsWith("history.")) return "history";
  return "general";
}
