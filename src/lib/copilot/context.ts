// ─── Copilot Context & Undo System ──────────────────────────────────────

export interface UndoSnapshot {
  label: string;
  timestamp: number;
  branding: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    tone: string;
    buttonStyle: string;
    logoUrl: string | null;
  } | null;
  blocks: Array<{
    blockType: string;
    sortOrder: number;
    isVisible: boolean;
    settingsJson: string;
    source: string;
    state: string;
  }> | null;
}

export interface ConversationContext {
  lastAction: string | null;
  lastBlockType: string | null;
  lastColorChanged: string | null;
  lastFontChanged: string | null;
  lastThemeApplied: string | null;
  currentDevice: "desktop" | "mobile";
  undoStack: UndoSnapshot[];
}

const MAX_UNDO = 10;

export function createEmptyContext(): ConversationContext {
  return {
    lastAction: null,
    lastBlockType: null,
    lastColorChanged: null,
    lastFontChanged: null,
    lastThemeApplied: null,
    currentDevice: "desktop",
    undoStack: [],
  };
}

export function updateContext(
  ctx: ConversationContext,
  updates: Partial<Omit<ConversationContext, "undoStack">>,
): ConversationContext {
  return { ...ctx, ...updates };
}

export function pushUndoSnapshot(
  ctx: ConversationContext,
  label: string,
  branding: UndoSnapshot["branding"],
  blocks: UndoSnapshot["blocks"],
): ConversationContext {
  const snapshot: UndoSnapshot = {
    label,
    timestamp: Date.now(),
    branding,
    blocks,
  };
  const stack = [snapshot, ...ctx.undoStack].slice(0, MAX_UNDO);
  return { ...ctx, undoStack: stack };
}

export function popUndoSnapshot(ctx: ConversationContext): {
  ctx: ConversationContext;
  snapshot: UndoSnapshot | null;
} {
  if (ctx.undoStack.length === 0) return { ctx, snapshot: null };
  const [first, ...rest] = ctx.undoStack;
  return { ctx: { ...ctx, undoStack: rest }, snapshot: first };
}