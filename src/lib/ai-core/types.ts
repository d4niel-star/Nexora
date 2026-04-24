// ─── Nexora AI Core — Shared Types ──────────────────────────────────────
//
// One brain, many faces. The AI Core defines the conversation contract
// that BOTH the Global Assistant (admin-wide, Ads-strong) and the Store
// Editor Assistant (storefront design copilot) implement against.
//
// Both surfaces share:
//   · message classification (social / noise / action / follow-up / help)
//   · tone detection (formal/informal, brief/verbose, mood)
//   · adaptive responder (style matches the user, never "chatbot-y")
//   · response shape (Reply)
//
// They DO NOT share:
//   · operative context (an editor change never leaks to the global chat)
//   · domain dispatchers (each assistant owns its own intent set)
//   · undo stack (editor only)

export type AssistantId = "global" | "editor";

// ─── Tone profile ───────────────────────────────────────────────────────
//
// Detected from the latest user message. Drives how we phrase replies.

export type Register = "neutral" | "casual" | "formal";
export type Brevity = "short" | "medium" | "long";
export type Energy = "calm" | "neutral" | "excited";
export type Mood = "neutral" | "frustrated" | "playful" | "decisive";

export interface ToneProfile {
  register: Register;
  brevity: Brevity;
  energy: Energy;
  mood: Mood;
  /** True if the user used emojis / "jajaja" / lots of exclamation. */
  isPlayful: boolean;
  /** True if the message is essentially small talk. */
  isSocial: boolean;
}

// ─── Message classification ─────────────────────────────────────────────

export type MessageCategory =
  | "social"        // hola, buenas, gracias, jajaja
  | "noise"         // off-topic / random
  | "smalltalk"     // "todo bien?", "como va?"
  | "ask_help"      // "qué podés hacer?", "ayuda"
  | "ask_status"    // "cómo va la tienda?", "qué me falta?"
  | "domain_action" // real intent in domain
  | "follow_up"     // "eso no", "el anterior"
  | "ambiguous";

export interface Classification {
  category: MessageCategory;
  confidence: number;
  hint?: string;
}

// ─── Conversation context (per-assistant, never crossed) ─────────────────

export interface ConversationTurn {
  role: "user" | "assistant";
  text: string;
  ts: number;
}

export interface CoreContext {
  /** Last assistant intent that ran successfully. */
  lastIntent: string | null;
  /** Last domain the user worked on (e.g. "ads", "design", "navigation"). */
  lastDomain: string | null;
  /** Rolling window of the last few turns (max 6). */
  history: ConversationTurn[];
  /** Active surface in the admin (route). Helps the global assistant. */
  currentRoute: string;
}

export function createCoreContext(currentRoute = "/admin"): CoreContext {
  return {
    lastIntent: null,
    lastDomain: null,
    history: [],
    currentRoute,
  };
}

export function pushTurn(ctx: CoreContext, turn: ConversationTurn): CoreContext {
  const history = [...ctx.history, turn].slice(-6);
  return { ...ctx, history };
}

// ─── Reply contract ─────────────────────────────────────────────────────
//
// Every assistant returns the same Reply shape. The chat UI renders it
// uniformly. Phrasing is adaptive (composeReply picks tone), but the
// structure stays predictable.

export type ReplyKind =
  | "ok"        // action executed / answer delivered
  | "info"      // informative answer (no mutation)
  | "ask"       // needs more info from user
  | "deny"      // can't do this here (out of scope for this assistant)
  | "err"       // tried, failed
  | "smalltalk" // social pleasantry
  | "noop";     // nothing to do

export interface ReplyAction {
  /** Optional client navigation target (router.push). */
  href?: string;
  /** Optional one-off label for the action button shown under the bubble. */
  label?: string;
}

export interface Reply {
  kind: ReplyKind;
  /** Main text shown in the bubble. Already tone-adapted. */
  text: string;
  /** Optional bullet list rendered under the main text. */
  bullets?: string[];
  /** Optional next-step suggestions ("podés probar también..."). */
  nextSteps?: string[];
  /** Optional clickable navigation suggestion. */
  action?: ReplyAction;
  /** Updated context to persist after this reply. */
  newContext?: CoreContext;
}
