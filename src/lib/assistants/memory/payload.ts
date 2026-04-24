// ─── Compact, versioned memory payloads for cross-session restore ───────
// · No raw secrets · trimmed text · separate keys per assistant · v1 schema

import {
  createCoreContext,
  type ConversationTurn,
  type CoreContext,
} from "@/lib/ai-core";
import { createEmptyContext } from "@/lib/copilot/context";
import { createEditorContext, type EditorContext, type PreviewSurface } from "../editor/state";

export const MEMORY_VERSION = 1 as const;
export const MAX_HISTORY_TURNS = 6;
export const MAX_TRANSCRIPT_MESSAGES = 12;
export const MAX_TURN_TEXT = 480;

export interface TranscriptLine {
  role: "user" | "assistant";
  text: string;
  ts: number;
}

export interface BaseMemoryPayloadV1 {
  v: typeof MEMORY_VERSION;
  lastIntent: string | null;
  lastDomain: string | null;
  currentRoute: string;
  /** Core rolling history for NLU (trimmed). */
  history: ConversationTurn[];
  /** Shorter thread for chat UI restore (trimmed). */
  transcript: TranscriptLine[];
  summaryLine: string;
  /** Optional hint (e.g. first nextStep from last reply). */
  lastRecommendation?: string;
}

export type GlobalMemoryPayloadV1 = BaseMemoryPayloadV1;

export interface EditorMemoryPayloadV1 extends BaseMemoryPayloadV1 {
  editor: {
    preview: PreviewSurface;
    lastAction: string | null;
    lastBlockType: string | null;
    lastColorChanged: string | null;
    lastFontChanged: string | null;
    lastThemeApplied: string | null;
    currentDevice: "desktop" | "mobile";
  };
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
): GlobalMemoryPayloadV1 {
  return {
    v: MEMORY_VERSION,
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
  opts?: { lastRecommendation?: string },
): EditorMemoryPayloadV1 {
  const base = buildGlobalMemoryPayload(ctx, transcript, opts);
  const e = ctx.editor;
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
    },
  };
}

export function hydrateGlobalContext(payload: GlobalMemoryPayloadV1 | null, liveRoute: string): CoreContext {
  if (!payload || payload.v !== MEMORY_VERSION) {
    return createCoreContext(liveRoute);
  }
  return {
    lastIntent: payload.lastIntent,
    lastDomain: payload.lastDomain,
    history: trimTurns(payload.history, MAX_HISTORY_TURNS, MAX_TURN_TEXT),
    currentRoute: liveRoute,
  };
}

export function hydrateEditorContext(payload: EditorMemoryPayloadV1 | null, liveRoute: string): EditorContext {
  const base = hydrateGlobalContext(payload, liveRoute);
  if (!payload || payload.v !== MEMORY_VERSION) {
    return createEditorContext(liveRoute);
  }
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

export function isEditorMemoryPayload(x: unknown): x is EditorMemoryPayloadV1 {
  return (
    typeof x === "object" &&
    x !== null &&
    (x as EditorMemoryPayloadV1).v === 1 &&
    "editor" in (x as EditorMemoryPayloadV1) &&
    typeof (x as EditorMemoryPayloadV1).editor === "object"
  );
}
