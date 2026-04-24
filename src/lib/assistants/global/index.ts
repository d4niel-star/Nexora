// ─── Global Assistant — built on the shared Deliberation Layer ──────────
//
// The Global Assistant is now an `AssistantAdapter` plugged into the AI
// Core's `deliberate()` pipeline. The pipeline owns intake, retrieval,
// social/help/status/follow-up short-circuits, ambiguity gates and
// post-checks. The adapter only owns:
//
//   · interpret  — concept-space scoring against GLOBAL_INTENTS
//   · verify     — refuse impulsive low-confidence dispatch, route
//                  design intents as `editor.handoff`
//   · dispatch   — execute via the navigation/Ads-aware dispatcher
//   · help       — admin + Ads-focused help reply
//   · status     — points the user to the dashboard
//
// Context is private: a CoreContext instance owned by NexoraGlobalChat
// flows in and out, never crossing the editor's context.

import {
  compose,
  deliberate,
  interpretWithFloor,
  type AssistantAdapter,
  type CoreContext,
  type DeliberationMeta,
  type DeliberationOptions,
  type DeliberationOutcome,
  type DomainPlan,
  type Reply,
  type ToneProfile,
  type TraceNote,
} from "@/lib/ai-core";
import { minConfidenceForGlobalHandoff } from "@/lib/ai-core/risk";
import { GLOBAL_INTENTS, type GlobalIntentId } from "./intents";
import { dispatchGlobal } from "./dispatcher";

// Confidence floor below which we refuse to act and ask the user to refine.
const CONF_FLOOR = 1.2;

const globalAdapter: AssistantAdapter<GlobalIntentId> = {
  id: "global",
  label: "Asistente del admin",

  interpret(raw, _ctx, _tone): DomainPlan<GlobalIntentId> {
    const r = interpretWithFloor<GlobalIntentId>(raw, GLOBAL_INTENTS, CONF_FLOOR);
    return {
      intent: r.id,
      confidence: r.id ? Math.min(1, r.score / 4) : 0,
      entities: { matched: r.matched },
      rawText: raw,
    };
  },

  verify(plan, _ctx, tone) {
    if (!plan.intent) return plan;

    // Editor handoff is a deliberate refusal — render the explanation
    // here so the dispatcher path doesn't need to special-case it.
    if (plan.intent === "editor.handoff") {
      const minH = minConfidenceForGlobalHandoff(
        plan.intent,
        plan.rawText?.length ?? 0,
      );
      if (plan.confidence < minH) {
        return compose({
          kind: "ask",
          tone,
          text: "No estoy seguro de qué retocar en el diseño. Decime con una frase qué sección o color querés ajustar y te acompaño.",
        });
      }
      return {
        ...plan,
        handoffTo: "editor" as const,
      };
    }

    // Belt and suspenders: if the matched intent has very low confidence
    // (the floor passed but barely), and there's a long ambiguous text,
    // ask for clarification instead of acting impulsively.
    if (plan.confidence < 0.32 && (plan.rawText?.length ?? 0) > 60) {
      const reply: Reply = compose({
        kind: "ask",
        tone,
        text: "No estoy 100% seguro de qué necesitás. Decímelo en una frase corta y lo resuelvo.",
      });
      return reply;
    }

    return plan;
  },

  async dispatch(plan, _ctx, tone): Promise<Reply> {
    if (!plan.intent) {
      return compose({
        kind: "noop",
        tone,
        text: "No sé qué hacer con eso desde acá.",
      });
    }
    return dispatchGlobal(plan.intent, tone, plan.rawText ?? "");
  },

  help(tone) {
    return compose({
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
    });
  },

  status(tone, _ctx) {
    return compose({
      kind: "info",
      tone,
      text: "Tu panorama vive en el dashboard: KPIs, alertas y tareas priorizadas.",
      action: { href: "/admin/dashboard", label: "Abrir dashboard" },
    });
  },
};

export interface GlobalProcessResult {
  reply: Reply;
  context: CoreContext;
  trace: TraceNote[];
  meta: DeliberationMeta;
}

export async function processGlobalMessage(
  raw: string,
  ctx: CoreContext,
  deliberationOptions?: DeliberationOptions,
): Promise<GlobalProcessResult> {
  const outcome: DeliberationOutcome = await deliberate(
    raw,
    globalAdapter,
    ctx,
    deliberationOptions,
  );
  return {
    reply: outcome.reply,
    context: outcome.context,
    trace: outcome.trace,
    meta: outcome.meta,
  };
}

export type { GlobalIntentId } from "./intents";
