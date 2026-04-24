// ─── Editor Assistant — private state ───────────────────────────────────
//
// `EditorContext` extends the shared `CoreContext` (so deliberation,
// follow-ups, tone history, etc. all "just work") with an editor-private
// sidecar that owns:
//
//   · the legacy `ConversationContext` from `lib/copilot/context` —
//     keeps undo stack and last-action metadata bit-compatible with the
//     existing engine without rewriting it
//   · the current device (desktop/mobile) and preview surface
//
// This sidecar is NEVER read by the global assistant. Cross-contamination
// is impossible because the global assistant constructs its own
// `CoreContext` and never instantiates `EditorContext`.

import type { CoreContext } from "@/lib/ai-core";
import type { ConversationContext } from "@/lib/copilot/context";
import { createEmptyContext } from "@/lib/copilot/context";

export type PreviewSurface = "home" | "listing" | "product" | "cart";

export interface EditorState {
  /** Bit-compatible legacy context (keeps undo stack & last-changes meta). */
  legacy: ConversationContext;
  preview: PreviewSurface;
}

export interface EditorContext extends CoreContext {
  editor: EditorState;
}

export function createEditorContext(currentRoute = "/admin/store/editor"): EditorContext {
  return {
    lastIntent: null,
    lastDomain: null,
    history: [],
    currentRoute,
    editor: {
      legacy: createEmptyContext(),
      preview: "home",
    },
  };
}

export function withEditor(
  ctx: EditorContext,
  patch: Partial<EditorState>,
): EditorContext {
  return { ...ctx, editor: { ...ctx.editor, ...patch } };
}
