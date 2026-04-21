// ─── Copilot Feedback System ─────────────────────────────────────────────

export interface CopilotResponse {
  summary: string;
  whatChanged: string[];
  whatDidNotChange: string[];
  nextSteps: string[];
  clarificationNeeded: string | null;
}

export function okResponse(summary: string, nextSteps: string[] = []): CopilotResponse {
  return { summary, whatChanged: [summary], whatDidNotChange: [], nextSteps, clarificationNeeded: null };
}

export function errResponse(summary: string, whatDidNotChange: string[], nextSteps: string[]): CopilotResponse {
  return { summary, whatChanged: [], whatDidNotChange, nextSteps, clarificationNeeded: null };
}

export function partialResponse(
  summary: string,
  whatChanged: string[],
  whatDidNotChange: string[],
  nextSteps: string[],
): CopilotResponse {
  return { summary, whatChanged, whatDidNotChange, nextSteps, clarificationNeeded: null };
}

export function clarifyResponse(clarification: string, nextSteps: string[] = []): CopilotResponse {
  return { summary: "Necesito más información", whatChanged: [], whatDidNotChange: [], nextSteps, clarificationNeeded: clarification };
}

export function formatResponse(resp: CopilotResponse): string {
  const parts: string[] = [];

  parts.push(resp.summary);

  if (resp.whatChanged.length > 1) {
    parts.push("");
    parts.push("✅ Cambios aplicados:");
    for (const c of resp.whatChanged) parts.push(`  • ${c}`);
  }

  if (resp.whatDidNotChange.length > 0) {
    parts.push("");
    parts.push("⚠️ No se pudo:");
    for (const c of resp.whatDidNotChange) parts.push(`  • ${c}`);
  }

  if (resp.nextSteps.length > 0) {
    parts.push("");
    parts.push("💡 Sugerencia:");
    for (const s of resp.nextSteps) parts.push(`  → ${s}`);
  }

  return parts.join("\n");
}

export const GREETING_RESPONSE: CopilotResponse = {
  summary: "¡Hola! Soy tu copiloto de diseño. Puedo ayudarte a personalizar tu tienda.\n\nProbá pedirme cosas como:\n  • \"algo más premium\"\n  • \"ocultá testimonios\"\n  • \"poné tonos beige\"\n  • \"fuente más editorial\"\n  • \"mostrame en celu\"\n  • \"deshacé eso\"",
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