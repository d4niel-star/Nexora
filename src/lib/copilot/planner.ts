// ─── Copilot Planner v3 ──────────────────────────────────────────────────
//
// Takes an InterpretedIntent from the Interpreter and produces one or more
// PlannedActions ready for execution. This is the decision layer that:
//   1. Maps abstract intent → concrete actions
//   2. Uses context to fill gaps in follow-ups
//   3. Decides confidence thresholds (execute / clarify / no-op)
//   4. Handles multi-step plans (e.g. "apply premium" → color + font + tone)

import { interpretInput, type InterpretedIntent } from "./interpreter";
import { splitCompoundInput } from "./normalizer";
import { VISUAL_TONE_PRESETS, FONT_BY_DESCRIPTOR, FONT_LABELS, BUTTON_STYLE_MAP } from "./vocabulary";
import type { ConversationContext } from "./context";

// ─── Types ──────────────────────────────────────────────────────────────
// Re-export ActionType and PlannedAction from engine for compatibility

export type ActionType =
  | "change-primary-color" | "change-secondary-color" | "change-color"
  | "change-font" | "change-font-by-style"
  | "change-tone" | "change-tone-by-mood" | "apply-visual-tone"
  | "change-button-style"
  | "change-hero-headline" | "change-hero-subheadline" | "change-hero-cta"
  | "change-hero-image"
  | "hide-section" | "show-section" | "move-section"
  | "apply-theme"
  | "switch-desktop" | "switch-mobile" | "switch-preview-surface"
  | "undo" | "greeting" | "help" | "unknown";

export interface PlannedAction {
  intent: ActionType;
  status: "ready" | "needs-clarification" | "unsupported" | "no-op";
  rawText: string;
  entities: Record<string, string>;
  clarification?: string;
}

export interface PlanResult {
  actions: PlannedAction[];
}

// ─── Main Planner ───────────────────────────────────────────────────────

export function planFromInput(raw: string, ctx: ConversationContext): PlanResult {
  // Step 1: Split compound inputs ("cambia el color, oculta testimonios")
  const parts = splitCompoundInput(raw);

  // Step 2: Interpret each part
  const interpretations = parts.map((part) => interpretInput(part, ctx));

  // Step 3: Plan actions for each interpretation
  const actions: PlannedAction[] = [];
  for (const interp of interpretations) {
    const planned = planAction(interp, ctx);
    actions.push(...planned);
  }

  // Step 4: Deduplicate and resolve conflicts
  return resolveConflicts(actions, ctx);
}

// ─── Single Intent Planning ─────────────────────────────────────────────

function planAction(intent: InterpretedIntent, ctx: ConversationContext): PlannedAction[] {
  // ── Meta intents ────────────────────────────────────────────────────
  if (intent.direction === "greeting") {
    return [{
      intent: "greeting",
      status: "ready",
      rawText: intent.rawText,
      entities: {},
    }];
  }

  if (intent.direction === "help") {
    return [{
      intent: "help",
      status: "ready",
      rawText: intent.rawText,
      entities: {},
    }];
  }

  if (intent.direction === "undo") {
    return [{
      intent: "undo",
      status: "ready",
      rawText: intent.rawText,
      entities: {},
    }];
  }

  if (intent.direction === "unknown" && intent.target === "none") {
    // Check if it's a confirmation follow-up with no pending context
    if (intent.isFollowUp && intent.followUpType === "confirmation") {
      return [{
        intent: "unknown",
        status: "no-op",
        rawText: intent.rawText,
        entities: {},
        clarification: "No hay un cambio pendiente para confirmar. Decime qué querés modificar.",
      }];
    }

    // Truly unknown — offer help
    return [{
      intent: "unknown",
      status: "unsupported",
      rawText: intent.rawText,
      entities: {},
      clarification: buildClarification(intent),
    }];
  }

  // ── Visual targets ──────────────────────────────────────────────────
  switch (intent.target) {
    case "full-style":
      return planVisualTone(intent, ctx);
    case "color":
      return planColorChange(intent, ctx);
    case "font":
      return planFontChange(intent, ctx);
    case "image":
      return planImageChange(intent, ctx);
    case "button":
      return planButtonChange(intent, ctx);
    case "section":
      return planSectionChange(intent, ctx);
    case "theme":
      return planThemeApply(intent, ctx);
    case "headline":
      return planCopyChange("change-hero-headline", intent, ctx);
    case "subheadline":
      return planCopyChange("change-hero-subheadline", intent, ctx);
    case "cta":
      return planCopyChange("change-hero-cta", intent, ctx);
    case "preview-device":
      return planPreviewDevice(intent, ctx);
    case "preview-surface":
      return planPreviewSurface(intent, ctx);
    default:
      return [{
        intent: "unknown",
        status: "unsupported",
        rawText: intent.rawText,
        entities: {},
        clarification: "No estoy seguro de qué querés cambiar. Probá algo como \"más premium\", \"cambiá el color\" o \"poné una imagen mejor\".",
      }];
  }
}

// ─── Visual Tone Planning ───────────────────────────────────────────────

function planVisualTone(intent: InterpretedIntent, _ctx: ConversationContext): PlannedAction[] {
  const toneKey = intent.specificValues.toneKey
    ?? intent.qualifiers.find(q => VISUAL_TONE_PRESETS[q])
    ?? "premium";

  const preset = VISUAL_TONE_PRESETS[toneKey];
  if (!preset) {
    return [{
      intent: "apply-visual-tone",
      status: "needs-clarification",
      rawText: intent.rawText,
      entities: {},
      clarification: `¿Qué estilo buscas? Opciones: premium, elegante, minimalista, moderno, cálido, oscuro, editorial, técnico.`,
    }];
  }

  return [{
    intent: "apply-visual-tone",
    status: "ready",
    rawText: intent.rawText,
    entities: {
      primaryColor: preset.primaryColor,
      secondaryColor: preset.secondaryColor,
      fontFamily: preset.fontFamily,
      tone: preset.tone,
      toneLabel: preset.label,
      toneDescription: preset.description,
    },
  }];
}

// ─── Color Change Planning ──────────────────────────────────────────────

function planColorChange(intent: InterpretedIntent, ctx: ConversationContext): PlannedAction[] {
  const hex = intent.specificValues.colorHex;
  const name = intent.specificValues.colorName ?? hex ?? "";
  const isCompound = intent.specificValues.isCompoundPalette === "true";

  // Follow-up with context: "más beige" after a color change
  if (!hex && ctx.lastColorChanged) {
    // Maybe they're referencing the last color — but with no new color specified
    return [{
      intent: "change-color",
      status: "needs-clarification",
      rawText: intent.rawText,
      entities: {},
      clarification: `¿A qué color querés cambiarlo? El último fue ${ctx.lastColorChanged}.`,
    }];
  }

  if (!hex) {
    return [{
      intent: "change-color",
      status: "needs-clarification",
      rawText: intent.rawText,
      entities: {},
      clarification: "¿Qué color querés? Probá \"azul\", \"beige\", \"marrón\", \"dorado\" o un HEX como #1A1A2E.",
    }];
  }

  if (isCompound) {
    return [{
      intent: "change-primary-color",
      status: "ready",
      rawText: intent.rawText,
      entities: {
        colorHex: intent.specificValues.colorHex,
        colorName: intent.specificValues.colorName,
        secondaryColorHex: intent.specificValues.secondaryColorHex,
        secondaryColorName: intent.specificValues.secondaryColorName,
        isCompoundPalette: "true",
      },
    }];
  }

  return [{
    intent: "change-primary-color",
    status: "ready",
    rawText: intent.rawText,
    entities: {
      colorHex: hex,
      colorName: name,
    },
  }];
}

// ─── Font Change Planning ───────────────────────────────────────────────

function planFontChange(intent: InterpretedIntent, ctx: ConversationContext): PlannedAction[] {
  const fontValue = intent.specificValues.fontValue;
  const fontLabel = intent.specificValues.fontLabel ?? fontValue ?? "";

  // Try to resolve from qualifiers ("más editorial" → font)
  if (!fontValue) {
    const qualiferFont = intent.qualifiers
      .map(q => resolveFontFromQualifier(q))
      .find(f => f !== null);

    if (qualiferFont) {
      return [{
        intent: "change-font-by-style",
        status: "ready",
        rawText: intent.rawText,
        entities: {
          fontValue: qualiferFont.value,
          fontLabel: qualiferFont.label,
        },
      }];
    }

    // Follow-up: maybe they want a different style of the current font
    if (ctx.lastFontChanged) {
      return [{
        intent: "change-font",
        status: "needs-clarification",
        rawText: intent.rawText,
        entities: {},
        clarification: "¿Qué estilo de tipografía buscás? Probá \"más editorial\", \"más moderna\", \"más clásica\".",
      }];
    }

    return [{
      intent: "change-font",
      status: "needs-clarification",
      rawText: intent.rawText,
      entities: {},
      clarification: "¿Qué tipografía querés? Probá \"más editorial\", \"más moderna\", o un nombre como \"Playfair Display\".",
    }];
  }

  return [{
    intent: "change-font",
    status: "ready",
    rawText: intent.rawText,
    entities: {
      fontValue,
      fontLabel,
    },
  }];
}

// ─── Image Change Planning ──────────────────────────────────────────────

function planImageChange(intent: InterpretedIntent, _ctx: ConversationContext): PlannedAction[] {
  return [{
    intent: "change-hero-image",
    status: "ready",
    rawText: intent.rawText,
    entities: {
      imageMood: intent.specificValues.imageMood ?? "premium",
      imageCategory: intent.specificValues.imageCategory ?? "lifestyle",
      targetBlock: intent.specificValues.targetBlock ?? "hero",
      imageStyleHints: intent.specificValues.imageStyleHints ?? "",
    },
  }];
}

// ─── Button Change Planning ─────────────────────────────────────────────

function planButtonChange(intent: InterpretedIntent, _ctx: ConversationContext): PlannedAction[] {
  const style = intent.specificValues.buttonStyle;

  if (!style) {
    // Try from qualifiers
    const qualifierStyle = intent.qualifiers
      .map(q => resolveButtonFromQualifier(q))
      .find(s => s !== null);

    if (qualifierStyle) {
      return [{
        intent: "change-button-style",
        status: "ready",
        rawText: intent.rawText,
        entities: {
          buttonStyle: qualifierStyle,
          buttonStyleLabel: qualifierStyle,
        },
      }];
    }

    return [{
      intent: "change-button-style",
      status: "needs-clarification",
      rawText: intent.rawText,
      entities: {},
      clarification: "¿Qué estilo de botón querés? Opciones: redondeado, cuadrado, pill (muy redondeado).",
    }];
  }

  return [{
    intent: "change-button-style",
    status: "ready",
    rawText: intent.rawText,
    entities: {
      buttonStyle: style,
      buttonStyleLabel: style,
    },
  }];
}

// ─── Section Change Planning ────────────────────────────────────────────

function planSectionChange(intent: InterpretedIntent, ctx: ConversationContext): PlannedAction[] {
  const sectionKey = intent.specificValues.sectionKey;
  const sectionLabel = intent.specificValues.sectionLabel ?? sectionKey ?? "";

  // Use context to fill missing section
  const effectiveSectionKey = sectionKey ?? ctx.lastBlockType;
  const effectiveSectionLabel = sectionLabel ?? (effectiveSectionKey ? capitalize(effectiveSectionKey) : "");

  if (!effectiveSectionKey) {
    return [{
      intent: "hide-section",
      status: "needs-clarification",
      rawText: intent.rawText,
      entities: {},
      clarification: "¿Qué sección? Opciones: Hero, Productos, Categorías, Beneficios, Testimonios, FAQ, Newsletter.",
    }];
  }

  switch (intent.direction) {
    case "hide":
      return [{
        intent: "hide-section",
        status: "ready",
        rawText: intent.rawText,
        entities: { sectionKey: effectiveSectionKey, sectionLabel: effectiveSectionLabel },
      }];
    case "show":
      return [{
        intent: "show-section",
        status: "ready",
        rawText: intent.rawText,
        entities: { sectionKey: effectiveSectionKey, sectionLabel: effectiveSectionLabel },
      }];
    case "move": {
      // Infer direction from text
      const raw = intent.rawText.toLowerCase();
      let direction: string;
      if (raw.includes("arriba") || raw.includes("subi") || raw.includes("subir") || raw.includes("principio")) {
        direction = raw.includes("principio") ? "top" : "up";
      } else if (raw.includes("abajo") || raw.includes("baja") || raw.includes("bajar") || raw.includes("final")) {
        direction = raw.includes("final") ? "bottom" : "down";
      } else {
        direction = "up"; // default
      }

      return [{
        intent: "move-section",
        status: "ready",
        rawText: intent.rawText,
        entities: {
          sectionKey: effectiveSectionKey,
          sectionLabel: effectiveSectionLabel,
          direction,
        },
      }];
    }
    default:
      // Ambiguous — ask
      return [{
        intent: "hide-section",
        status: "needs-clarification",
        rawText: intent.rawText,
        entities: {},
        clarification: `¿Querés ocultar, mostrar o mover "${effectiveSectionLabel}"?`,
      }];
  }
}

// ─── Theme Apply Planning ───────────────────────────────────────────────

function planThemeApply(intent: InterpretedIntent, _ctx: ConversationContext): PlannedAction[] {
  const themeId = intent.specificValues.themeId;
  const themeLabel = intent.specificValues.themeLabel ?? themeId ?? "";

  if (!themeId) {
    return [{
      intent: "apply-theme",
      status: "needs-clarification",
      rawText: intent.rawText,
      entities: {},
      clarification: "¿Qué tema querés aplicar? Escribí \"ayuda\" para ver los disponibles.",
    }];
  }

  return [{
    intent: "apply-theme",
    status: "ready",
    rawText: intent.rawText,
    entities: { themeId, themeLabel },
  }];
}

// ─── Copy Change Planning ───────────────────────────────────────────────

function planCopyChange(actionType: ActionType, intent: InterpretedIntent, _ctx: ConversationContext): PlannedAction[] {
  const textValue = intent.specificValues.textValue;

  if (!textValue) {
    const label = actionType === "change-hero-headline" ? "título"
      : actionType === "change-hero-subheadline" ? "subtítulo"
      : "texto del botón";

    return [{
      intent: actionType,
      status: "needs-clarification",
      rawText: intent.rawText,
      entities: {},
      clarification: `¿Qué ${label} querés poner? Usá comillas, por ejemplo: cambá el título a "Mi nuevo título".`,
    }];
  }

  return [{
    intent: actionType,
    status: "ready",
    rawText: intent.rawText,
    entities: { textValue },
  }];
}

// ─── Preview Device Planning ────────────────────────────────────────────

function planPreviewDevice(intent: InterpretedIntent, _ctx: ConversationContext): PlannedAction[] {
  const device = intent.specificValues.device ?? "mobile";
  return [{
    intent: device === "mobile" ? "switch-mobile" : "switch-desktop",
    status: "ready",
    rawText: intent.rawText,
    entities: {},
  }];
}

// ─── Preview Surface Planning ───────────────────────────────────────────

function planPreviewSurface(intent: InterpretedIntent, _ctx: ConversationContext): PlannedAction[] {
  return [{
    intent: "switch-preview-surface",
    status: "ready",
    rawText: intent.rawText,
    entities: { surface: intent.specificValues.surface ?? "home" },
  }];
}

// ─── Conflict Resolution ────────────────────────────────────────────────

function resolveConflicts(actions: PlannedAction[], _ctx: ConversationContext): PlanResult {
  // Remove duplicate intents
  const seen = new Set<string>();
  const unique: PlannedAction[] = [];

  for (const action of actions) {
    const key = `${action.intent}:${JSON.stringify(action.entities)}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(action);
    }
  }

  // If we have both apply-visual-tone AND change-color, prefer change-color
  // (more specific intent wins over general)
  const hasColorChange = unique.some(a => a.intent === "change-primary-color" || a.intent === "change-color");
  const hasVisualTone = unique.some(a => a.intent === "apply-visual-tone");

  if (hasColorChange && hasVisualTone) {
    return { actions: unique.filter(a => a.intent !== "apply-visual-tone") };
  }

  return { actions: unique };
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function resolveFontFromQualifier(qualifier: string): { value: string; label: string } | null {
  const font = FONT_BY_DESCRIPTOR[qualifier];
  if (font) return { value: font, label: FONT_LABELS[font] ?? font };
  return null;
}

function resolveButtonFromQualifier(qualifier: string): string | null {
  return BUTTON_STYLE_MAP[qualifier] ?? null;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function buildClarification(intent: InterpretedIntent): string {
  if (intent.confidence === 0) {
    return "No entendí bien qué querés cambiar. Probá algo como \"más premium\", \"cambiá el color a azul\", \"ocultá testimonios\" o escribí \"ayuda\".";
  }
  return "¿Podrías ser un poco más específico? Por ejemplo: \"quiero algo más premium\", \"cambiá la tipografía\" o \"poné una imagen mejor\".";
}