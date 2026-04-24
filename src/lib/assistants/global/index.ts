// ─── Global Assistant — orchestrator ────────────────────────────────────
//
// Public entry-point used by NexoraGlobalChat. Pipeline:
//   1. detect tone (so every reply matches the user's register)
//   2. classify the message family
//   3. for social/help/status meta categories, return canned-but-tone-adapted
//      replies via the AI Core composer
//   4. for domain actions, run the concept-space interpreter against
//      GLOBAL_INTENTS and dispatch
//   5. fallback: a graceful "no entendí" with concrete next steps
//
// CONTEXT IS PRIVATE: the global assistant has its own CoreContext,
// completely independent from the editor assistant. They share the
// brain (ai-core), not the conversation state.

import {
  classifyMessage,
  compose,
  detectTone,
  interpretWithFloor,
  pickSocialReply,
  pushTurn,
  type CoreContext,
  type Reply,
} from "@/lib/ai-core";
import { GLOBAL_INTENTS, type GlobalIntentId } from "./intents";
import { dispatchGlobal } from "./dispatcher";

export interface GlobalProcessResult {
  reply: Reply;
  context: CoreContext;
}

export async function processGlobalMessage(
  raw: string,
  ctx: CoreContext,
): Promise<GlobalProcessResult> {
  const tone = detectTone(raw);
  const cls = classifyMessage(raw);

  // ── Social / smalltalk ────────────────────────────────────────────
  if (cls.category === "social") {
    const reply = compose({
      kind: "smalltalk",
      tone,
      text: pickSocialReply(cls.hint, tone),
    });
    return finalize(reply, ctx, raw, "social");
  }

  if (cls.category === "smalltalk") {
    const text =
      tone.register === "casual"
        ? "Todo bien por acá. ¿Qué necesitás?"
        : "Todo en orden. ¿En qué te ayudo?";
    return finalize(
      compose({ kind: "smalltalk", tone, text }),
      ctx,
      raw,
      "social",
    );
  }

  // ── Help ──────────────────────────────────────────────────────────
  if (cls.category === "ask_help") {
    return finalize(
      compose({
        kind: "info",
        tone,
        text:
          tone.brevity === "short"
            ? "Soy fuerte en Ads (Meta, TikTok, Google) y conozco todo el admin."
            : "Soy el asistente del admin. Mi fuerte es Ads (Meta, TikTok, Google), pero también te ayudo con navegación, estado del negocio, pedidos, productos, envíos y configuración.",
        bullets: [
          "Recomendaciones de campañas y rendimiento",
          "Estado de conexiones, píxeles y tags",
          "Llevarte a cualquier sección del admin",
          "Resumen de tu negocio y alertas",
        ],
        nextSteps: [
          "Probá: \"recomendaciones de Meta Ads\"",
          "Probá: \"llevame a estadísticas\"",
          "Probá: \"cómo va el negocio\"",
        ],
      }),
      ctx,
      raw,
      "help",
    );
  }

  // ── Status (broad) ────────────────────────────────────────────────
  if (cls.category === "ask_status") {
    return finalize(
      compose({
        kind: "info",
        tone,
        text: "Tu panorama vive en el dashboard: KPIs, alertas y tareas priorizadas.",
        action: { href: "/admin/dashboard", label: "Abrir dashboard" },
      }),
      ctx,
      raw,
      "status",
    );
  }

  // ── Follow-up ─────────────────────────────────────────────────────
  if (cls.category === "follow_up") {
    if (!ctx.lastIntent) {
      return finalize(
        compose({
          kind: "ask",
          tone,
          text: "¿A qué te referís? Decímelo con un poco más de detalle.",
        }),
        ctx,
        raw,
        "noop",
      );
    }
    // Re-run last intent (good for "de nuevo", "el anterior")
    const reply = await dispatchGlobal(ctx.lastIntent as GlobalIntentId, tone, raw);
    return finalize(reply, ctx, raw, ctx.lastIntent);
  }

  // ── Domain action ─────────────────────────────────────────────────
  const interp = interpretWithFloor<GlobalIntentId>(raw, GLOBAL_INTENTS, 1.2);

  if (interp.id) {
    const reply = await dispatchGlobal(interp.id, tone, raw);
    return finalize(reply, ctx, raw, interp.id);
  }

  // ── Fallback ──────────────────────────────────────────────────────
  return finalize(
    compose({
      kind: "ask",
      tone,
      text:
        tone.register === "casual"
          ? "Mmm, no me cerró. ¿Lo decís de otra forma?"
          : "No terminé de entender. ¿Podés reformular?",
      nextSteps: [
        "Probá: \"recomendaciones de ads\"",
        "Probá: \"llevame a pedidos\"",
        "Probá: \"cómo va el negocio\"",
      ],
    }),
    ctx,
    raw,
    "ambiguous",
  );
}

function finalize(
  reply: Reply,
  ctx: CoreContext,
  raw: string,
  intent: string,
): GlobalProcessResult {
  let next = pushTurn(ctx, { role: "user", text: raw, ts: Date.now() });
  next = pushTurn(next, {
    role: "assistant",
    text: reply.text,
    ts: Date.now(),
  });
  if (intent !== "noop" && intent !== "social") {
    next = { ...next, lastIntent: intent, lastDomain: domainOf(intent) };
  }
  return { reply: { ...reply, newContext: next }, context: next };
}

function domainOf(intent: string): string {
  if (intent.startsWith("ads.")) return "ads";
  if (intent.startsWith("nav.")) return "navigation";
  if (intent.startsWith("status.")) return "status";
  if (intent.startsWith("editor.")) return "editor";
  return "general";
}

export type { GlobalIntentId } from "./intents";
