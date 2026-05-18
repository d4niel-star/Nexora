// ─── Visual Editor Pro — Undo/Redo History ──────────────────────────────────
//
// Memory-safe circular buffer. Stores snapshots of blocks + navigation.
// Supports Ctrl+Z / Ctrl+Y. No persistence across sessions.

import type { EditorSnapshot } from "./types";

const MAX_HISTORY = 50;

export class EditorHistory {
  private past: EditorSnapshot[] = [];
  private future: EditorSnapshot[] = [];

  push(snapshot: EditorSnapshot): void {
    this.past.push(structuredClone(snapshot));
    if (this.past.length > MAX_HISTORY) {
      this.past.shift();
    }
    // New action clears redo stack
    this.future = [];
  }

  undo(current: EditorSnapshot): EditorSnapshot | null {
    if (this.past.length === 0) return null;
    const previous = this.past.pop()!;
    this.future.push(structuredClone(current));
    return previous;
  }

  redo(current: EditorSnapshot): EditorSnapshot | null {
    if (this.future.length === 0) return null;
    const next = this.future.pop()!;
    this.past.push(structuredClone(current));
    return next;
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }
}
