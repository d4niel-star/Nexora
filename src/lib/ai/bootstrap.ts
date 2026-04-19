// ─── AI Provider Bootstrap ───
// Importar una sola vez en el entry point del servidor (layout.tsx o instrumentation.ts).

import { registerBuilderProvider } from "@/lib/ai/builder/provider";
import { MockBuilderProvider } from "@/lib/ai/builder/mock-provider";

// Registrar mock siempre como fallback
registerBuilderProvider(MockBuilderProvider);

// Registrar Anthropic solo si la API key está presente
if (process.env.ANTHROPIC_API_KEY) {
  // Import dinámico para no romper build si el SDK no está instalado
  import("@/lib/ai/builder/anthropic-provider").then(({ AnthropicBuilderProvider }) => {
    registerBuilderProvider(AnthropicBuilderProvider);
  });
}

// Registrar Gemini solo si la API key está presente.
// Si falla el import (SDK no instalado) o la key es inválida en runtime,
// el provider degrada silenciosamente: getBuilderProvider() caerá a mock
// o al provider activo restante y las páginas siguen renderizando.
if (process.env.GEMINI_API_KEY) {
  import("@/lib/ai/builder/gemini-provider").then(({ GeminiBuilderProvider }) => {
    registerBuilderProvider(GeminiBuilderProvider);
  });
}
