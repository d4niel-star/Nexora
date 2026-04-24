// ─── Compact, versioned memory payloads for cross-session restore ───────
// · v1 = legacy; v2 = + savedAt, editor continuity + contentSignature
// · No secrets · trimmed text · separate assistants

import {
  createCoreContext,
  type ConversationTurn,
  type CoreContext,
} from "@/lib/ai-core";
import { createEmptyContext } from "@/lib/copilot/context";
import { createEditorContext, type EditorContext, type PreviewSurface } from "../editor/state";

export const MEMORY_V1 = 1 as const;
export const MEMORY_V2 = 2 as const;
export const MEMORY_TTL_DAYS = 45;
export const MAX_HISTORY_TURNS = 6;
export const MAX_TRANSCRIPT_MESSAGES = 12;
export const MAX_TURN_TEXT = 480;

export interface TranscriptLine {
  role: "user" | "assistant";
  text: string;
  ts: number;
}

export interface BaseMemoryCore {
  lastIntent: string | null;
  lastDomain: string | null;
  currentRoute: string;
  history: ConversationTurn[];
  transcript: TranscriptLine[];
  summaryLine: string;
  lastRecommendation?: string;
}

export interface BaseMemoryPayloadV1 extends BaseMemoryCore {
  v: typeof MEMORY_V1;
}

export interface BaseMemoryPayloadV2 extends BaseMemoryCore {
  v: typeof MEMORY_V2;
  /** Client clock when this snapshot was built (ms). */
  savedAt: number;
}

export type GlobalMemoryPayloadV1 = BaseMemoryPayloadV1;
export type GlobalMemoryPayloadV2 = BaseMemoryPayloadV2;

export interface EditorMemoryBody {
  preview: PreviewSurface;
  lastAction: string | null;
  lastBlockType: string | null;
  lastColorChanged: string | null;
  lastFontChanged: string | null;
  lastThemeApplied: string | null;
  currentDevice: "desktop" | "mobile";
  /** Fingerprint of branding + home blocks at save (see `signature.ts`). */
  contentSignature?: string;
  /** One-line resumable hint for the copilot (not shown as CoT). */
  resumeHint?: string;
  /** Human label for the last successful mutation, if any. */
  lastMutationLabel?: string;
}

export interface EditorMemoryPayloadV1 extends BaseMemoryPayloadV1 {
  editor: EditorMemoryBody;
}

export interface EditorMemoryPayloadV2 extends BaseMemoryPayloadV2 {
  editor: EditorMemoryBody;
}

export function buildResumeHint(ctx: EditorContext): string {
  const p = ctx.editor.preview;
  const a = ctx.editor.legacy.lastAction;
  if (!a) return `Editor · ${p}`;
  return `Editor · ${p} · ${a.replace(/-/g, " ")}`;
}

function clamp(s: string, n: number): string {
  if (s.length <= n) return s;
  return `${s.slice(0, n - 1)}…`;
}

function trimTurns(turns: ConversationTurn[], max: number, maxChars: number): ConversationTurn[] {
  return turns.slice(-max).map((t) => ({ ...t, text: clamp(t.text, maxChars) }));
}

export function trimTranscript(lines: TranscriptLine[], max: number, maxChars: number): TranscriptLine[] {
  return lines.slice(-max).map((l) => ({ ...l, text: clamp(l.text, maxChars) }));
}

export function deriveSummaryLine(
  ctx: CoreContext,
  lastUserLine: string,
  lastReplyPreview?: string,
): string {
  const u = clamp(lastUserLine, 64);
  const dom = ctx.lastDomain ?? "general";
  const hint = lastReplyPreview ? ` → ${clamp(lastReplyPreview, 60)}` : "";
  return `${u} · ${dom}${hint}`;
}

export function buildGlobalMemoryPayload(
  ctx: CoreContext,
  transcript: TranscriptLine[],
  opts?: { lastRecommendation?: string },
): GlobalMemoryPayloadV2 {
  return {
    v: MEMORY_V2,
    savedAt: Date.now(),
    lastIntent: ctx.lastIntent,
    lastDomain: ctx.lastDomain,
    currentRoute: ctx.currentRoute,
    history: trimTurns(ctx.history, MAX_HISTORY_TURNS, MAX_TURN_TEXT),
    transcript: trimTranscript(transcript, MAX_TRANSCRIPT_MESSAGES, MAX_TURN_TEXT),
    summaryLine: deriveSummaryLine(
      ctx,
      transcript.filter((l) => l.role === "user").slice(-1)[0]?.text ?? "(sin mensaje reciente)",
      transcript.filter((l) => l.role === "assistant").slice(-1)[0]?.text,
    ),
    lastRecommendation: opts?.lastRecommendation,
  };
}

export function buildEditorMemoryPayload(
  ctx: EditorContext,
  transcript: TranscriptLine[],
  opts?: {
    lastRecommendation?: string;
    contentSignature?: string;
  },
): EditorMemoryPayloadV2 {
  const base = buildGlobalMemoryPayload(ctx, transcript, opts);
  const e = ctx.editor;
  const lastMutationLabel = e.legacy.lastAction
    ? e.legacy.lastAction.replace(/-/g, " ")
    : undefined;
  return {
    ...base,
    editor: {
      preview: e.preview,
      lastAction: e.legacy.lastAction,
      lastBlockType: e.legacy.lastBlockType,
      lastColorChanged: e.legacy.lastColorChanged,
      lastFontChanged: e.legacy.lastFontChanged,
      lastThemeApplied: e.legacy.lastThemeApplied,
      currentDevice: e.legacy.currentDevice,
      contentSignature: opts?.contentSignature,
      resumeHint: buildResumeHint(ctx),
      lastMutationLabel,
    },
  };
}

function coreFromAnyPayload(
  payload: { lastIntent: string | null; lastDomain: string | null; history: ConversationTurn[] } | null,
  liveRoute: string,
): CoreContext {
  if (!payload) return createCoreContext(liveRoute);
  return {
    lastIntent: payload.lastIntent,
    lastDomain: payload.lastDomain,
    history: trimTurns(payload.history, MAX_HISTORY_TURNS, MAX_TURN_TEXT),
    currentRoute: liveRoute,
  };
}

export function hydrateGlobalContext(
  payload: GlobalMemoryPayloadV1 | GlobalMemoryPayloadV2 | null,
  liveRoute: string,
): CoreContext {
  if (!payload) return createCoreContext(liveRoute);
  if (payload.v !== MEMORY_V1 && payload.v !== MEMORY_V2) {
    return createCoreContext(liveRoute);
  }
  return coreFromAnyPayload(payload, liveRoute);
}

export function hydrateEditorContext(
  payload: EditorMemoryPayloadV1 | EditorMemoryPayloadV2 | null,
  liveRoute: string,
): EditorContext {
  if (!payload) return createEditorContext(liveRoute);
  if (payload.v !== MEMORY_V1 && payload.v !== MEMORY_V2) {
    return createEditorContext(liveRoute);
  }
  if (!isEditorBodyPayload(payload)) {
    return createEditorContext(liveRoute);
  }
  const base = coreFromAnyPayload(payload, liveRoute);
  return {
    ...base,
    editor: {
      preview: payload.editor.preview,
      legacy: {
        ...createEmptyContext(),
        lastAction: payload.editor.lastAction,
        lastBlockType: payload.editor.lastBlockType,
        lastColorChanged: payload.editor.lastColorChanged,
        lastFontChanged: payload.editor.lastFontChanged,
        lastThemeApplied: payload.editor.lastThemeApplied,
        currentDevice: payload.editor.currentDevice,
        undoStack: [],
      },
    },
  };
}

function isEditorBodyPayload(
  p: BaseMemoryPayloadV1 | BaseMemoryPayloadV2,
): p is EditorMemoryPayloadV1 | EditorMemoryPayloadV2 {
  return typeof (p as EditorMemoryPayloadV2).editor === "object" && (p as EditorMemoryPayloadV2).editor != null;
}

export function isEditorMemoryPayload(x: unknown): x is EditorMemoryPayloadV1 | EditorMemoryPayloadV2 {
  if (typeof x !== "object" || x === null) return false;
  const o = x as { v?: number; editor?: unknown };
  if (o.v !== MEMORY_V1 && o.v !== MEMORY_V2) return false;
  return typeof o.editor === "object" && o.editor != null;
}

export function getEditorContentSignature(
  p: EditorMemoryPayloadV1 | EditorMemoryPayloadV2,
): string | undefined {
  return p.editor.contentSignature;
}
