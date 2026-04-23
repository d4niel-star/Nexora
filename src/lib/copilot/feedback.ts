// ─── Nexora AI Core — Feedback System ──────────────────────────────────
//
// CAPA 6 del AI Core unificado.
// Estilo de respuesta consistente para TODAS las superficies.
// Un solo cerebro = un solo tono.

export interface CopilotResponse {
  summary: string;
  whatChanged: string[];
  whatDidNotChange: string[];
  nextSteps: string[];
  clarificationNeeded: string | null;
}

// ─── Factory helpers ────────────────────────────────────────────────────

export function okResponse(summary: string, nextSteps: string[] = []): CopilotResponse {
  return { summary, whatChanged: [summary], whatDidNotChange: [], nextSteps, clarificationNeeded: null };
}

export function errResponse(summary: string, whatDidNotChange: string[], nextSteps: string[]): CopilotResponse {
  return { summary, whatChanged: [], whatDidNotChange, nextSteps, clarificationNeeded: null };
}

export function partialResponse(summary: string, whatChanged: string[], whatDidNotChange: string[], nextSteps: string[]): CopilotResponse {
  return { summary, whatChanged, whatDidNotChange, nextSteps, clarificationNeeded: null };
}

export function clarifyResponse(clarification: string, nextSteps: string[] = []): CopilotResponse {
  return { summary: "Necesito más información", whatChanged: [], whatDidNotChange: [], nextSteps, clarificationNeeded: clarification };
}

// ─── Unified responses by category ─────────────────────────────────────

export const GREETING_RESPONSE: CopilotResponse = {
  summary: "¡Hola! Soy Nexora IA, tu copiloto de diseño. Puedo ayudarte a personalizar tu tienda.\n\nProbá pedirme cosas como:\n  • \"algo más premium\"\n  • \"ocultá testimonios\"\n  • \"poné tonos beige\"\n  • \"fuente más editorial\"\n  • \"mostrame en celu\"\n  • \"deshacé eso\"",
  whatChanged: [],
  whatDidNotChange: [],
  nextSteps: [],
  clarificationNeeded: null,
};

export const HELP_RESPONSE: CopilotResponse = {
  summary: "Esto es lo que puedo hacer por vos:\n\n🎨 Visual: \"algo más premium\", \"más sobrio\", \"más elegante\", \"negro y beige\"\n🖌️ Colores: \"cambiá el color a dorado\", \"poné tonos azul\"\n🔤 Tipografía: \"fuente más editorial\", \"más moderna\", \"más técnica\"\n🔘 Botones: \"botón más redondeado\", \"hacelo pill\"\n📄 Secciones: \"ocultá testimonios\", \"mostrá beneficios\", \"mové FAQ arriba\"\n📝 Copy: \"cambiá el headline a 'Nuevo texto'\"\n📱 Preview: \"mostrame en celu\", \"ver en desktop\"\n↩️ Deshacer: \"deshacé eso\", \"revertí\"\n\nTambién puedo hacer varias cosas a la vez: \"poné tonos beige, cambiá la fuente y ocultá testimonios\"",
  whatChanged: [],
  whatDidNotChange: [],
  nextSteps: [],
  clarificationNeeded: null,
};

export const SOCIAL_RESPONSE: CopilotResponse = {
  summary: "¡Bien! Decime qué querés cambiar o revisar y lo hago desde acá.",
  whatChanged: [],
  whatDidNotChange: [],
  nextSteps: ["Probá decirme: \"algo más premium\", \"cambiá los botones\", o \"mostrame en celu\""],
  clarificationNeeded: null,
};

export const THANKS_RESPONSE: CopilotResponse = {
  summary: "¡De nada! Si querés seguir ajustando, decime.",
  whatChanged: [],
  whatDidNotChange: [],
  nextSteps: [],
  clarificationNeeded: null,
};

export const NOISE_RESPONSE: CopilotResponse = {
  summary: "Puedo ayudarte con tu tienda o con el panel. Decime qué querés cambiar o revisar.",
  whatChanged: [],
  whatDidNotChange: [],
  nextSteps: ["Probá: \"algo más premium\", \"cambiá los colores\", o \"qué me falta\""],
  clarificationNeeded: null,
};

export const AMBIGUOUS_RESPONSE: CopilotResponse = {
  summary: "No estoy seguro de qué querés. ¿Podrías ser más específico?",
  whatChanged: [],
  whatDidNotChange: [],
  nextSteps: ["Probá decirme algo como: \"algo más premium\", \"cambiá los botones\", o \"ocultá testimonios\""],
  clarificationNeeded: "¿Qué querés que haga?",
};

// ─── Formatter ──────────────────────────────────────────────────────────

export function formatResponse(resp: CopilotResponse): string {
  const parts: string[] = [];

  if (resp.summary) parts.push(resp.summary);

  if (resp.whatChanged.length > 0 && resp.whatChanged[0] !== resp.summary) {
    parts.push(`✅ Cambios: ${resp.whatChanged.join(", ")}`);
  }

  if (resp.whatDidNotChange.length > 0) {
    parts.push(`⚠️ Sin cambio: ${resp.whatDidNotChange.join(", ")}`);
  }

  if (resp.nextSteps.length > 0 && !resp.summary.includes("Probá")) {
    parts.push(`💡 ${resp.nextSteps.join(" | ")}`);
  }

  return parts.join("\n\n");
}