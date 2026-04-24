// ─── Store Editor Assistant — built on the shared Deliberation Layer ────
//
// The Editor Assistant is the second `AssistantAdapter` plugged into the
// AI Core's `deliberate()` pipeline. It shares the same brain (intake,
// classification, tone, follow-up, ambiguity gates, post-check) with the
// Global Assistant, but keeps its specialization:
//
//   · its OWN intent vocabulary, owned by `lib/copilot/engine.processInput`
//     (colors, fonts, hero, sections, themes, preview switches, undo)
//   · its OWN context — `EditorContext` carries the legacy
//     `ConversationContext` with the undo stack and last-action metadata
//   · its OWN dispatcher in `./dispatcher.ts` that performs the side
//     effects on branding/blocks/themes
//
// The chat shell in `NexoraEditorChat.tsx` only knows about
// `processEditorMessage`. It never imports from `lib/copilot/*` directly,
// which is the whole point of the unification.

import {
  compose,
  deliberate,
  type AssistantAdapter,
  type DeliberationOutcome,
  type DomainPlan,
  type Reply,
  type ToneProfile,
} from "@/lib/ai-core";
import {
  processInput as legacyProcessInput,
  type ActionType,
  type PlannedAction,
} from "@/lib/copilot/engine";
import { updateContext } from "@/lib/copilot/context";
import {
  dispatchEditorAction,
  type EditorCallbacks,
} from "./dispatcher";
import {
  createEditorContext,
  type EditorContext,
} from "./state";

// ─── Shared editor intent id ────────────────────────────────────────────
//
// We keep ActionType values ("change-primary-color" | "hide-section" | …)
// as the intent id seen by the deliberation layer. This avoids a second
// translation table and keeps post-check / follow-up logic working with
// the same identifiers the editor's planner already produces.

export type EditorIntentId = ActionType;

// ─── Stash for the planned action (entities+rawText survive) ────────────
//
// `DomainPlan` has loose entities; we stash the FULL `PlannedAction` from
// the legacy planner inside the entities bag so `dispatch` can re-read it
// without re-parsing. This keeps verifier + dispatcher in lockstep.

interface EditorEntities {
  planned: PlannedAction;
}

// ─── Module-scoped callbacks (set per render by the chat shell) ─────────
//
// React component re-renders with potentially new callback identities, so
// we keep a mutable holder and let `processEditorMessage` accept the
// callbacks for the current invocation. This avoids leaking React refs
// into the assistant and keeps the adapter pure with respect to React.

let activeCallbacks: EditorCallbacks = {
  onActionApplied: () => {},
};

const editorAdapter: AssistantAdapter<EditorIntentId> = {
  id: "editor",
  label: "Copiloto de diseño",

  interpret(raw, ctx, _tone): DomainPlan<EditorIntentId> {
    const editorCtx = ctx as EditorContext;
    const legacy = editorCtx.editor.legacy;
    const result = legacyProcessInput(raw, legacy);

    // No actions at all → impulsive dispatch is forbidden, return null intent
    if (!result.actions.length) {
      return { intent: null, confidence: 0, rawText: raw };
    }

    // First, prefer a "ready" action (clean, fully-resolved).
    const ready = result.actions.find((a) => a.status === "ready");
    if (ready) {
      // greeting/help are handled by the deliberation layer's
      // social/help short-circuits — but the legacy planner still emits
      // them. We map them to null so the layer falls through correctly.
      if (ready.intent === "greeting" || ready.intent === "help" || ready.intent === "unknown") {
        return { intent: null, confidence: 0, rawText: raw };
      }
      const entities: EditorEntities = { planned: ready };
      return {
        intent: ready.intent,
        confidence: ready.confidence,
        entities: entities as unknown as Record<string, unknown>,
        rawText: raw,
      };
    }

    // Then, an action that needs clarification → surface that nicely.
    const needsClarif = result.actions.find((a) => a.status === "needs-clarification");
    if (needsClarif?.clarification) {
      return {
        intent: null,
        confidence: needsClarif.confidence,
        needsClarification: needsClarif.clarification,
        rawText: raw,
      };
    }

    // Unsupported → null intent (deliberation layer will ask to reformulate).
    return { intent: null, confidence: 0, rawText: raw };
  },

  verify(plan, _ctx, tone) {
    if (!plan.intent) return plan;

    // Belt-and-suspenders: low-confidence destructive actions go through
    // a confirmation prompt rather than impulsive execution.
    if (plan.confidence < 0.45 && isDestructive(plan.intent)) {
      const planned = (plan.entities as unknown as EditorEntities | undefined)?.planned;
      const hint = planned ? planned.rawText : plan.rawText ?? "";
      const reply: Reply = compose({
        kind: "ask",
        tone,
        text:
          tone.register === "casual"
            ? `Decimelo más concreto antes de aplicar. "${truncate(hint, 60)}" me dejó dudando.`
            : `¿Podés ser un poco más concreto? "${truncate(hint, 60)}" me dejó con dudas y prefiero confirmar antes de tocar el diseño.`,
      });
      return reply;
    }

    return plan;
  },

  async dispatch(plan, ctx, tone): Promise<Reply> {
    const planned = (plan.entities as unknown as EditorEntities | undefined)?.planned;
    if (!planned) {
      return compose({
        kind: "noop",
        tone,
        text: "No tengo una acción concreta para ejecutar.",
      });
    }
    const editorCtx = ctx as EditorContext;
    const result = await dispatchEditorAction(
      planned,
      editorCtx.editor.legacy,
      tone,
      activeCallbacks,
    );
    // Persist the new legacy ctx + last-action metadata on the EDITOR
    // context the chat will receive in `outcome.context`. We do this by
    // mutating the editor sidecar of the same `ctx` object — `deliberate`
    // will then spread it through `pushTurn` so changes survive.
    const updatedLegacy = updateContextFromAction(result.legacy, planned);
    editorCtx.editor.legacy = updatedLegacy;
    return result.reply;
  },

  resolveFollowUp(_raw, ctx, tone) {
    const editorCtx = ctx as EditorContext;
    // Editor-specific follow-up: "deshacé" / "atrás" → undo via legacy
    // planner. We simulate a fresh planning call with "deshacelo" so the
    // legacy engine surfaces the undo action.
    const result = legacyProcessInput("deshacelo", editorCtx.editor.legacy);
    const undoAction = result.actions.find((a) => a.intent === "undo" && a.status === "ready");
    if (undoAction) {
      return {
        intent: undoAction.intent,
        confidence: 0.9,
        entities: { planned: undoAction } as unknown as Record<string, unknown>,
        rawText: "(follow-up undo)",
      };
    }
    if (!ctx.lastIntent) {
      return compose({
        kind: "ask",
        tone,
        text: "¿A qué te referís? Decime qué cambio querés revisar.",
      });
    }
    return null; // deliberate falls back to default (re-run last intent)
  },

  help(tone) {
    return compose({
      kind: "info",
      tone,
      text:
        tone.brevity === "short"
          ? "Soy tu copiloto de diseño. Te ayudo con colores, tipografías, hero, secciones y temas."
          : "Soy el copiloto de diseño del editor. Te ayudo a refinar la tienda: colores, tipografías, hero, secciones, imágenes, tono y temas. Cada cambio se puede deshacer.",
      bullets: [
        "Cambios de color y palabras (\"poné el principal en azul\")",
        "Tipografías por estilo (\"más editorial\", \"más moderna\")",
        "Hero (\"cambiá el headline a …\", \"imagen premium\")",
        "Secciones (\"ocultá testimonios\", \"mové productos arriba\")",
        "Temas (\"aplicá el tema oscuro\")",
      ],
      nextSteps: [
        "Probá: \"poné un look más premium\"",
        "Probá: \"imagen de skincare\"",
        "Probá: \"deshacé eso\"",
      ],
    });
  },
};

// ─── Public API consumed by the chat shell ──────────────────────────────

export interface EditorProcessOptions {
  callbacks: EditorCallbacks;
}

export async function processEditorMessage(
  raw: string,
  ctx: EditorContext,
  options: EditorProcessOptions,
): Promise<{ reply: Reply; context: EditorContext }> {
  // Make callbacks visible to the adapter for THIS invocation.
  activeCallbacks = options.callbacks;
  try {
    const outcome: DeliberationOutcome = await deliberate(raw, editorAdapter, ctx);
    return {
      reply: outcome.reply,
      context: outcome.context as EditorContext,
    };
  } finally {
    // Reset to a no-op holder so a stray call without callbacks can't run.
    activeCallbacks = { onActionApplied: () => {} };
  }
}

export { createEditorContext, type EditorContext } from "./state";
export type { EditorCallbacks } from "./dispatcher";

// ─── Helpers ────────────────────────────────────────────────────────────

function isDestructive(intent: ActionType): boolean {
  return (
    intent !== "undo" &&
    intent !== "switch-desktop" &&
    intent !== "switch-mobile" &&
    intent !== "switch-preview-surface" &&
    intent !== "greeting" &&
    intent !== "help" &&
    intent !== "unknown"
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

function updateContextFromAction(
  ctx: import("@/lib/copilot/context").ConversationContext,
  action: PlannedAction,
): import("@/lib/copilot/context").ConversationContext {
  const e = action.entities;
  switch (action.intent) {
    case "change-primary-color":
    case "change-secondary-color":
    case "change-color":
      return updateContext(ctx, {
        lastAction: action.intent,
        lastColorChanged: e.colorHex ?? e.colorName ?? "",
      });
    case "change-font":
    case "change-font-by-style":
      return updateContext(ctx, {
        lastAction: action.intent,
        lastFontChanged: e.fontValue ?? "",
      });
    case "hide-section":
    case "show-section":
    case "move-section":
      return updateContext(ctx, {
        lastAction: action.intent,
        lastBlockType: e.sectionKey ?? "",
      });
    case "apply-visual-tone":
      return updateContext(ctx, {
        lastAction: action.intent,
        lastThemeApplied: e.toneLabel ?? "",
      });
    case "apply-theme":
      return updateContext(ctx, {
        lastAction: action.intent,
        lastThemeApplied: e.themeId ?? "",
      });
    case "switch-mobile":
      return updateContext(ctx, { currentDevice: "mobile", lastAction: action.intent });
    case "switch-desktop":
      return updateContext(ctx, { currentDevice: "desktop", lastAction: action.intent });
    default:
      return updateContext(ctx, { lastAction: action.intent });
  }
}
