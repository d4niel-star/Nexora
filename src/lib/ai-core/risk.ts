// ─── Action risk + confidence floors (editor + shared helpers) ─────────
// Tuning goal: block ambiguous destructive paths without freezing clear asks.
// Intent ids mirror `ActionType` in `lib/copilot/engine` without importing it
// to keep `ai-core` free of a dependency on the copilot.

export type ActionRiskTier = "low" | "med" | "high";

const HIGH = new Set<string>([
  "apply-theme",
  "apply-visual-tone",
  "change-hero-image",
  "move-section",
  "hide-section",
  "show-section",
  "change-hero-headline",
  "change-hero-subheadline",
  "change-hero-cta",
]);

const MED = new Set<string>([
  "change-primary-color",
  "change-secondary-color",
  "change-color",
  "change-font",
  "change-font-by-style",
  "change-tone",
  "change-tone-by-mood",
  "change-button-style",
]);

export function editorActionRisk(intent: string): ActionRiskTier {
  if (HIGH.has(intent)) return "high";
  if (MED.has(intent)) return "med";
  return "low";
}

/** Minimum interpretation confidence to auto-execute at this risk level. */
export function minConfidenceForEditorRisk(
  risk: ActionRiskTier,
  hasStrongEntity: boolean,
): number {
  if (hasStrongEntity) {
    if (risk === "high") return 0.48;
    if (risk === "med") return 0.38;
    return 0.3;
  }
  if (risk === "high") return 0.55;
  if (risk === "med") return 0.45;
  return 0.34;
}

/**
 * Heuristic: plan has extracted entities (color hex, section key, etc.)
 * so we can be slightly more permissive.
 */
export function editorPlanHasStrongEntity(
  intent: string,
  entities: Record<string, string> | undefined,
): boolean {
  if (!entities) return false;
  const e = entities;
  if (e.colorHex || e.themeId || e.sectionKey || e.textValue) return true;
  if (intent === "change-hero-image" && (e.imageMood || e.imageCategory)) return true;
  if (e.fontValue) return true;
  return false;
}

export function isEditorDestructiveIntent(intent: string): boolean {
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

/** Global: navigation / ads "cost" of wrong route — use soft floor. */
export function minConfidenceForGlobalHandoff(
  intent: string,
  rawLen: number,
): number {
  if (intent === "editor.handoff" && rawLen > 50) return 0.38;
  if (intent.startsWith("ads.") && rawLen > 80) return 0.28;
  return 0.22;
}
