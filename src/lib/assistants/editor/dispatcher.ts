// ─── Editor Assistant — dispatcher ──────────────────────────────────────
//
// Owns the side-effecting part of editing the storefront. Same surface
// area as the legacy `executeAction` previously embedded inline in
// `NexoraEditorChat`, but now isolated and tone-aware.
//
// Responsibilities:
//   · build undo snapshots BEFORE destructive mutations
//   · execute branding / blocks / theme / hero mutations via the existing
//     server actions in `lib/store-engine/actions` and `lib/themes/actions`
//   · honor the editor's specialized callbacks (device switch, preview surface)
//   · surface clean Reply objects (kind = ok | err | info | ask) with
//     bullets / next steps so the chat UI stays consistent across
//     assistants
//
// We import the legacy `PlannedAction` from `copilot/engine` because it
// still owns the editor's specialized vocabulary (colors, palettes,
// hero, sections, themes…). The deliberation layer wraps it in a
// `DomainPlan` so the shared brain doesn't need to know about it.

import type { ConversationContext } from "@/lib/copilot/context";
import { popUndoSnapshot, pushUndoSnapshot } from "@/lib/copilot/context";
import type { ActionType, PlannedAction } from "@/lib/copilot/engine";
import { compose, type Reply, type ToneProfile } from "@/lib/ai-core";

// ─── Editor callbacks ───────────────────────────────────────────────────
//
// These flow from the React component into the dispatcher because preview
// device / surface are UI-only concerns; the dispatcher only needs to
// notify the editor shell once a switch action runs.

export interface EditorCallbacks {
  onActionApplied: () => void;
  onDeviceChange?: (device: "desktop" | "mobile") => void;
  onPreviewSurfaceChange?: (surface: "home" | "listing" | "product" | "cart") => void;
}

export interface DispatchResult {
  reply: Reply;
  legacy: ConversationContext;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function describeAction(action: PlannedAction): string {
  const labels: Record<ActionType, string> = {
    "change-primary-color": "Cambio de color principal",
    "change-secondary-color": "Cambio de color secundario",
    "change-color": "Cambio de color",
    "change-font": "Cambio de tipografía",
    "change-font-by-style": "Cambio de tipografía por estilo",
    "change-tone": "Cambio de tono",
    "change-tone-by-mood": "Cambio de tono",
    "apply-visual-tone": "Tono visual aplicado",
    "change-button-style": "Cambio de estilo de botón",
    "change-hero-headline": "Cambio de headline",
    "change-hero-subheadline": "Cambio de subheadline",
    "change-hero-cta": "Cambio de CTA",
    "change-hero-image": "Cambio de imagen",
    "hide-section": "Sección ocultada",
    "show-section": "Sección mostrada",
    "move-section": "Sección movida",
    "apply-theme": "Tema aplicado",
    "switch-desktop": "Vista desktop",
    "switch-mobile": "Vista mobile",
    "switch-preview-surface": "Cambio de preview",
    undo: "Deshacer",
    greeting: "Saludo",
    help: "Ayuda",
    unknown: "Desconocido",
  };
  return labels[action.intent] ?? action.intent;
}

async function buildSnapshot(): Promise<{
  branding: import("@/lib/copilot/context").UndoSnapshot["branding"];
  blocks: import("@/lib/copilot/context").UndoSnapshot["blocks"];
} | null> {
  try {
    const { fetchHomeBlocks, fetchStoreBranding } = await import("@/lib/store-engine/actions");
    const [blocks, branding] = await Promise.all([fetchHomeBlocks(), fetchStoreBranding()]);
    return {
      branding: branding
        ? {
            primaryColor: branding.primaryColor,
            secondaryColor: branding.secondaryColor,
            fontFamily: branding.fontFamily,
            tone: branding.tone,
            buttonStyle: branding.buttonStyle,
            logoUrl: branding.logoUrl,
          }
        : null,
      blocks: blocks
        ? blocks.map((b: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
            blockType: b.blockType,
            sortOrder: b.sortOrder,
            isVisible: b.isVisible,
            settingsJson:
              typeof b.settingsJson === "string"
                ? b.settingsJson
                : JSON.stringify(b.settingsJson ?? {}),
            source: b.source ?? "template",
            state: b.state ?? "draft",
          }))
        : null,
    };
  } catch {
    return null;
  }
}

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

// ─── Public dispatch ────────────────────────────────────────────────────

export async function dispatchEditorAction(
  action: PlannedAction,
  legacyCtx: ConversationContext,
  tone: ToneProfile,
  callbacks: EditorCallbacks,
): Promise<DispatchResult> {
  let next = legacyCtx;

  // ── Snapshot BEFORE destructive mutations (preserves undo) ─────────
  if (isDestructive(action.intent)) {
    const snapshot = await buildSnapshot();
    next = pushUndoSnapshot(
      next,
      describeAction(action),
      snapshot?.branding ?? null,
      snapshot?.blocks ?? null,
    );
  }

  const e = action.entities;

  try {
    switch (action.intent) {
      // ── Colors ─────────────────────────────────────────────────────
      case "change-primary-color":
      case "change-color": {
        if (!e.colorHex) {
          return badReply(
            tone,
            "Color no reconocido. Probá \"azul\", \"dorado\" o un HEX como #1A1A2E.",
            next,
          );
        }
        const { saveStoreBranding } = await import("@/lib/store-engine/actions");
        if (e.isCompoundPalette === "true" && e.secondaryColorHex) {
          await saveStoreBranding({
            primaryColor: e.colorHex,
            secondaryColor: e.secondaryColorHex,
          });
          callbacks.onActionApplied();
          return okReply(
            tone,
            `Paleta aplicada: principal ${e.colorName ?? e.colorHex} + secundario ${e.secondaryColorName ?? e.secondaryColorHex}`,
            next,
          );
        }
        await saveStoreBranding({ primaryColor: e.colorHex });
        callbacks.onActionApplied();
        return okReply(tone, `Color principal → ${e.colorName ?? e.colorHex}`, next);
      }
      case "change-secondary-color": {
        if (!e.colorHex) return badReply(tone, "Color secundario no reconocido.", next);
        const { saveStoreBranding } = await import("@/lib/store-engine/actions");
        await saveStoreBranding({ secondaryColor: e.colorHex });
        callbacks.onActionApplied();
        return okReply(tone, `Color secundario → ${e.colorName ?? e.colorHex}`, next);
      }

      // ── Fonts / tone / button style ────────────────────────────────
      case "change-font":
      case "change-font-by-style": {
        if (!e.fontValue) return badReply(tone, "Tipografía no reconocida. Probá \"más editorial\" o \"más moderna\".", next);
        const { saveStoreBranding } = await import("@/lib/store-engine/actions");
        await saveStoreBranding({ fontFamily: e.fontValue });
        callbacks.onActionApplied();
        return okReply(tone, `Tipografía → ${e.fontLabel ?? e.fontValue}`, next, [
          "Probá \"ver en celu\" para verlo en mobile.",
        ]);
      }
      case "change-tone":
      case "change-tone-by-mood": {
        if (!e.toneValue) return badReply(tone, "Tono no reconocido. Opciones: Profesional, Premium, Técnico, Cercano.", next);
        const { saveStoreBranding } = await import("@/lib/store-engine/actions");
        await saveStoreBranding({ tone: e.toneValue });
        callbacks.onActionApplied();
        return okReply(tone, `Tono de copy → ${e.toneLabel ?? e.toneValue}`, next);
      }
      case "apply-visual-tone": {
        if (!e.primaryColor) return badReply(tone, "No se pudo resolver el estilo. Probá \"más premium\" o \"negro y beige\".", next);
        const { saveStoreBranding } = await import("@/lib/store-engine/actions");
        await saveStoreBranding({
          primaryColor: e.primaryColor,
          secondaryColor: e.secondaryColor,
          fontFamily: e.fontFamily,
          tone: e.tone,
        });
        callbacks.onActionApplied();
        return okReply(
          tone,
          `Estilo "${e.toneLabel}" aplicado — ${e.toneDescription ?? "look actualizado"}`,
          next,
        );
      }
      case "change-button-style": {
        if (!e.buttonStyle) return badReply(tone, "Estilo no reconocido. Probá \"redondeado\", \"cuadrado\" o \"pill\".", next);
        const { saveStoreBranding } = await import("@/lib/store-engine/actions");
        await saveStoreBranding({ buttonStyle: e.buttonStyle });
        callbacks.onActionApplied();
        return okReply(tone, `Botón → estilo ${e.buttonStyleLabel ?? e.buttonStyle}`, next);
      }

      // ── Hero (headline/sub/CTA/image) ──────────────────────────────
      case "change-hero-headline":
      case "change-hero-subheadline":
      case "change-hero-cta": {
        if (!e.textValue) {
          return badReply(
            tone,
            "No pude extraer el texto. Usá comillas: cambiá el headline a \"Mi título\".",
            next,
          );
        }
        const { fetchHomeBlocks, saveHomeBlocks } = await import("@/lib/store-engine/actions");
        const blocks = await fetchHomeBlocks();
        if (!blocks?.length) return badReply(tone, "No hay bloques. Aplicá un tema primero.", next);
        const fieldKey =
          action.intent === "change-hero-headline"
            ? "headline"
            : action.intent === "change-hero-subheadline"
            ? "subheadline"
            : "primaryActionLabel";
        await saveHomeBlocks(
          blocks.map((b: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
            b.blockType !== "hero"
              ? b
              : {
                  ...b,
                  settingsJson: JSON.stringify({
                    ...(typeof b.settingsJson === "string"
                      ? JSON.parse(b.settingsJson)
                      : b.settingsJson ?? {}),
                    [fieldKey]: e.textValue,
                  }),
                },
          ),
        );
        callbacks.onActionApplied();
        const label =
          action.intent === "change-hero-headline"
            ? "Headline"
            : action.intent === "change-hero-subheadline"
            ? "Subheadline"
            : "CTA";
        return okReply(tone, `${label} del hero → "${e.textValue}"`, next);
      }
      case "change-hero-image": {
        const { generateHeroImageAction, fetchHomeBlocks, saveHomeBlocks } = await import(
          "@/lib/store-engine/actions"
        );
        const imgResult = await generateHeroImageAction({
          mood: e.imageMood || "premium",
          category: e.imageCategory || "lifestyle",
          styleHints: e.imageStyleHints || "",
          originalText: action.rawText,
          targetBlock: e.targetBlock || "hero",
        });
        if (!imgResult.ok || !imgResult.url) {
          return badReply(
            tone,
            `No pude resolver una imagen. Probá: "imagen premium" o "foto de skincare".${imgResult.error ? ` (${imgResult.error})` : ""}`,
            next,
          );
        }
        const blocks = await fetchHomeBlocks();
        if (!blocks?.length) return badReply(tone, "No hay bloques. Aplicá un tema primero.", next);
        await saveHomeBlocks(
          blocks.map((b: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
            b.blockType !== "hero"
              ? b
              : {
                  ...b,
                  settingsJson: JSON.stringify({
                    ...(typeof b.settingsJson === "string"
                      ? JSON.parse(b.settingsJson)
                      : b.settingsJson ?? {}),
                    backgroundImageUrl: imgResult.url,
                  }),
                },
          ),
        );
        callbacks.onActionApplied();
        const sourceLabel =
          imgResult.source === "generated"
            ? "Imagen generada con IA"
            : "Imagen curada";
        return okReply(
          tone,
          `${sourceLabel} aplicada al hero — "${imgResult.alt}".`,
          next,
        );
      }

      // ── Sections (show/hide/move) ──────────────────────────────────
      case "hide-section":
      case "show-section": {
        if (!e.sectionKey) {
          return badReply(
            tone,
            "Sección no reconocida. Opciones: Hero, Productos, Categorías, Beneficios, Testimonios, FAQ, Newsletter.",
            next,
          );
        }
        const { fetchHomeBlocks, saveHomeBlocks } = await import("@/lib/store-engine/actions");
        const blocks = await fetchHomeBlocks();
        if (!blocks?.length) return badReply(tone, "No hay bloques.", next);
        const target = blocks.find((b: any) => b.blockType === e.sectionKey); // eslint-disable-line @typescript-eslint/no-explicit-any
        if (!target) return badReply(tone, `Sección "${e.sectionLabel ?? e.sectionKey}" no encontrada.`, next);
        const desiredVisible = action.intent === "show-section";
        if (target.isVisible === desiredVisible) {
          return badReply(
            tone,
            `${e.sectionLabel ?? e.sectionKey} ya estaba ${desiredVisible ? "visible" : "oculta"}. Sin cambios.`,
            next,
          );
        }
        await saveHomeBlocks(
          blocks.map((b: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
            b.blockType === e.sectionKey ? { ...b, isVisible: desiredVisible } : b,
          ),
        );
        callbacks.onActionApplied();
        return okReply(
          tone,
          `${e.sectionLabel ?? e.sectionKey} → ${desiredVisible ? "visible" : "oculta"}`,
          next,
          ["Escribí \"deshacé\" si querés revertir."],
        );
      }
      case "move-section": {
        if (!e.sectionKey || !e.direction) {
          return badReply(tone, "No se pudo determinar qué sección mover o hacia dónde.", next);
        }
        const { fetchHomeBlocks, saveHomeBlocks } = await import("@/lib/store-engine/actions");
        const blocks = await fetchHomeBlocks();
        if (!blocks?.length) return badReply(tone, "No hay bloques.", next);
        const sorted = [...blocks].sort((a: any, b: any) => a.sortOrder - b.sortOrder); // eslint-disable-line @typescript-eslint/no-explicit-any
        const idx = sorted.findIndex((b: any) => b.blockType === e.sectionKey); // eslint-disable-line @typescript-eslint/no-explicit-any
        if (idx === -1) return badReply(tone, `Sección "${e.sectionLabel}" no encontrada.`, next);
        const dir = e.direction as "up" | "down" | "top" | "bottom";
        let newOrder: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
        if (dir === "up" && idx > 0) {
          newOrder = [...sorted];
          [newOrder[idx], newOrder[idx - 1]] = [newOrder[idx - 1], newOrder[idx]];
        } else if (dir === "down" && idx < sorted.length - 1) {
          newOrder = [...sorted];
          [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
        } else if (dir === "top" && idx > 0) {
          const item = sorted.splice(idx, 1)[0];
          sorted.unshift(item);
          newOrder = sorted;
        } else if (dir === "bottom" && idx < sorted.length - 1) {
          const item = sorted.splice(idx, 1)[0];
          sorted.push(item);
          newOrder = sorted;
        } else {
          return badReply(tone, `No se puede mover "${e.sectionLabel}" en esa dirección.`, next);
        }
        const updated = newOrder.map((b: any, i: number) => ({ ...b, sortOrder: i })); // eslint-disable-line @typescript-eslint/no-explicit-any
        await saveHomeBlocks(updated);
        callbacks.onActionApplied();
        const dirLabel = dir === "up" ? "arriba" : dir === "down" ? "abajo" : dir === "top" ? "al principio" : "al final";
        return okReply(tone, `${e.sectionLabel} movida ${dirLabel}`, next);
      }

      // ── Theme ──────────────────────────────────────────────────────
      case "apply-theme": {
        if (!e.themeId) return badReply(tone, "Tema no reconocido.", next);
        const { applyBuiltInTemplateAction } = await import("@/lib/themes/actions");
        const result = await applyBuiltInTemplateAction(e.themeId);
        if (result.ok) {
          callbacks.onActionApplied();
          return okReply(
            tone,
            `Tema "${e.themeLabel ?? e.themeId}" aplicado — ${result.blocksCreated} bloques creados`,
            next,
          );
        }
        return badReply(tone, result.errors?.[0] ?? "No se pudo aplicar el tema.", next);
      }

      // ── Preview switches (no DB mutation) ──────────────────────────
      case "switch-mobile": {
        callbacks.onDeviceChange?.("mobile");
        return okReply(tone, "Vista mobile activada.", next);
      }
      case "switch-desktop": {
        callbacks.onDeviceChange?.("desktop");
        return okReply(tone, "Vista desktop activada.", next);
      }
      case "switch-preview-surface": {
        const labels: Record<string, string> = {
          home: "Home",
          listing: "Listado",
          product: "Producto",
          cart: "Carrito",
        };
        if (e.surface) {
          callbacks.onPreviewSurfaceChange?.(e.surface as "home" | "listing" | "product" | "cart");
        }
        return okReply(tone, `Preview cambiado a: ${labels[e.surface] ?? e.surface}`, next);
      }

      // ── Undo ───────────────────────────────────────────────────────
      case "undo": {
        const { ctx: poppedCtx, snapshot } = popUndoSnapshot(legacyCtx); // ← original ctx, not snapshotted next
        if (!snapshot) return badReply(tone, "No hay cambios previos para deshacer.", legacyCtx);
        if (snapshot.branding) {
          const { saveStoreBranding } = await import("@/lib/store-engine/actions");
          await saveStoreBranding({
            primaryColor: snapshot.branding.primaryColor,
            secondaryColor: snapshot.branding.secondaryColor,
            fontFamily: snapshot.branding.fontFamily,
            tone: snapshot.branding.tone,
            buttonStyle: snapshot.branding.buttonStyle,
          });
        }
        if (snapshot.blocks) {
          const { saveHomeBlocks } = await import("@/lib/store-engine/actions");
          await saveHomeBlocks(
            snapshot.blocks.map((b) => ({
              blockType: b.blockType as any, // eslint-disable-line @typescript-eslint/no-explicit-any
              sortOrder: b.sortOrder,
              isVisible: b.isVisible,
              settingsJson: b.settingsJson,
              source: b.source,
              state: b.state,
            })),
          );
        }
        callbacks.onActionApplied();
        return okReply(tone, `Revertido: "${snapshot.label}". Tienda restaurada al estado anterior.`, poppedCtx);
      }

      default:
        return badReply(tone, `Acción "${action.intent}" no implementada.`, next);
    }
  } catch (err) {
    const msg = (err as Error).message ?? "Error desconocido";
    return badReply(tone, `Hubo un problema ejecutando la acción: ${msg}`, next);
  }
}

// ─── Reply factories (tone-adapted via composer) ────────────────────────

function okReply(
  tone: ToneProfile,
  text: string,
  legacy: ConversationContext,
  nextSteps?: string[],
): DispatchResult {
  return {
    reply: compose({ kind: "ok", tone, text, nextSteps }),
    legacy,
  };
}

function badReply(
  tone: ToneProfile,
  text: string,
  legacy: ConversationContext,
): DispatchResult {
  return {
    reply: compose({ kind: "err", tone, text }),
    legacy,
  };
}
