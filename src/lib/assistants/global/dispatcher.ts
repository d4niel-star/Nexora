// ─── Global Assistant — dispatcher ──────────────────────────────────────
//
// Pure client-side dispatcher: takes an intent + a tone profile and
// returns a Reply. For navigation it returns an `action` so the chat UI
// can router.push(). For Ads recommendations it imports the server action
// dynamically. Anything design-related triggers a friendly handoff to the
// editor (we do NOT execute design changes here — that's the editor's
// assistant job, separate context, separate undo, separate vocabulary).

import type { Reply, ToneProfile } from "@/lib/ai-core";
import { compose } from "@/lib/ai-core";
import type { GlobalIntentId } from "./intents";

const NAV_TARGETS: Partial<Record<GlobalIntentId, { href: string; label: string }>> = {
  "nav.dashboard": { href: "/admin/dashboard", label: "Abrir dashboard" },
  "nav.orders": { href: "/admin/orders", label: "Ver pedidos" },
  "nav.products": { href: "/admin/catalog", label: "Abrir catálogo" },
  "nav.inventory": { href: "/admin/inventory", label: "Abrir inventario" },
  "nav.stats": { href: "/admin/stats", label: "Ver estadísticas" },
  "nav.payments": { href: "/admin/payments", label: "Abrir pagos" },
  "nav.shipping": { href: "/admin/shipping", label: "Abrir envíos" },
  "nav.marketing": { href: "/admin/marketing", label: "Abrir marketing" },
  "nav.store": { href: "/admin/store", label: "Abrir mi tienda" },
  "nav.editor": { href: "/admin/store/editor", label: "Abrir editor" },
  "nav.settings": { href: "/admin/settings", label: "Abrir configuración" },
  "ads.go.meta": { href: "/admin/ads/meta", label: "Abrir Meta Ads" },
  "ads.go.tiktok": { href: "/admin/ads/tiktok", label: "Abrir TikTok Ads" },
  "ads.go.google": { href: "/admin/ads/google", label: "Abrir Google Ads" },
  "ads.go.pixels": { href: "/admin/ads/pixels", label: "Configurar píxeles" },
  "ads.connect.meta": { href: "/admin/ads/meta", label: "Conectar Meta" },
  "ads.connect.tiktok": { href: "/admin/ads/tiktok", label: "Conectar TikTok" },
  "ads.connect.google": { href: "/admin/ads/google", label: "Conectar Google" },
};

export async function dispatchGlobal(
  intent: GlobalIntentId,
  tone: ToneProfile,
  raw: string,
): Promise<Reply> {
  // Navigation-style intents: just return an action.
  const nav = NAV_TARGETS[intent];
  if (nav) {
    return compose({
      kind: "ok",
      tone,
      text: `Te llevo a ${nav.label.replace(/^Abrir |^Ver |^Conectar /i, "").toLowerCase()}.`,
      action: { href: nav.href, label: nav.label },
    });
  }

  switch (intent) {
    case "ads.recommendations": {
      return compose({
        kind: "info",
        tone,
        text: "Las recomendaciones se generan en cada panel de Ads (Meta, TikTok o Google) con tus métricas reales.",
        nextSteps: ["Abrir Meta Ads", "Abrir TikTok Ads", "Abrir Google Ads"],
        action: { href: "/admin/ads/meta", label: "Abrir Meta Ads" },
      });
    }
    case "ads.connections.status": {
      return compose({
        kind: "info",
        tone,
        text: "Mirá el estado de conexiones desde cada plataforma. Si una cuenta no está vinculada, ahí mismo podés conectarla.",
        bullets: [
          "Meta Ads: /admin/ads/meta",
          "TikTok Ads: /admin/ads/tiktok",
          "Google Ads: /admin/ads/google",
        ],
        action: { href: "/admin/ads/meta", label: "Revisar conexiones" },
      });
    }
    case "ads.pixels.status": {
      return compose({
        kind: "info",
        tone,
        text: "Los píxeles y tags se configuran desde el panel de Píxeles y tags. Te paso el atajo.",
        action: { href: "/admin/ads/pixels", label: "Configurar píxeles" },
      });
    }
    case "ads.performance": {
      return compose({
        kind: "info",
        tone,
        text: "El rendimiento de cada plataforma vive en su panel: ROAS, CPA, CTR e impresiones del último período.",
        nextSteps: ["Meta", "TikTok", "Google"],
        action: { href: "/admin/ads/meta", label: "Ver Meta Ads" },
      });
    }
    case "status.business": {
      return compose({
        kind: "info",
        tone,
        text: "Tu panorama general (KPIs, alertas y tareas priorizadas) vive en el dashboard.",
        action: { href: "/admin/dashboard", label: "Abrir dashboard" },
      });
    }
    case "status.alerts": {
      return compose({
        kind: "info",
        tone,
        text: "El centro de alertas y pendientes está en el dashboard, ordenado por prioridad.",
        action: { href: "/admin/dashboard", label: "Ver pendientes" },
      });
    }
    case "status.revenue": {
      return compose({
        kind: "info",
        tone,
        text: "Tu facturación, ingresos y métricas comerciales están en Estadísticas.",
        action: { href: "/admin/stats", label: "Ver estadísticas" },
      });
    }
    case "editor.handoff": {
      return compose({
        kind: "deny",
        tone,
        text:
          tone.register === "casual"
            ? "Eso lo hacés desde el editor. Te lo abro y seguís ahí con el copiloto de diseño."
            : "Los cambios de diseño viven en el editor de tienda. Te lo abro y seguís ahí.",
        action: { href: "/admin/store/editor", label: "Abrir editor" },
      });
    }
    default:
      return compose({
        kind: "noop",
        tone,
        text: "No estoy seguro de cómo ayudarte con eso desde acá.",
      });
  }
  // Unused param silenced for future extensions
  void raw;
}
