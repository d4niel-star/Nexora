import type { AIChatProvider, ChatMessage, ChatResponse } from "./provider";

/**
 * MockChatProvider: Generates contextual responses for development and demo.
 * Returns realistic assistant responses based on the system prompt context.
 */
export const MockChatProvider: AIChatProvider = {
  id: "mock",

  async chat(messages: ChatMessage[], systemPrompt: string): Promise<ChatResponse> {
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));

    const lastUser = messages.filter((m) => m.role === "user").pop()?.content ?? "";
    const lower = lastUser.toLowerCase();

    // Context-aware responses
    let response: string;

    if (lower.includes("producto") || lower.includes("descripcion") || lower.includes("título")) {
      response = `📝 **Sugerencia para tu catálogo:**\n\nBasándome en tu tienda, te recomiendo:\n\n1. **Títulos claros y con beneficio**: En lugar de "Crema Facial", usá "Crema Hidratante de Día FPS 30 — Protección + Luminosidad"\n2. **Descripciones que vendan**: Incluí el problema que resuelve, ingredientes clave y un CTA\n3. **Keywords naturales**: Integrá términos de búsqueda sin forzarlos\n\n¿Querés que te ayude con algún producto específico?`;
    } else if (lower.includes("venta") || lower.includes("conversion") || lower.includes("convertir")) {
      response = `📊 **Tips para mejorar conversión:**\n\n1. **Hero con propuesta de valor clara** — Tu visitante debe entender qué vendés en 3 segundos\n2. **Social proof visible** — Testimonios y reseñas cerca del botón de compra\n3. **Envío gratis** — Ofrecer envío gratis desde cierto monto aumenta el ticket promedio un 15-25%\n4. **Urgencia real** — Stock limitado o promociones temporales\n5. **Checkout simplificado** — Menos pasos = más ventas\n\nTu tienda ya tiene checkout con Mercado Pago integrado, lo cual es una gran ventaja. ¿Querés que analice algún punto específico?`;
    } else if (lower.includes("marketing") || lower.includes("campaña") || lower.includes("promo")) {
      response = `🎯 **Ideas de marketing para tu tienda:**\n\n1. **Email de bienvenida** con descuento del 10% para primer compra\n2. **Campaña de recompra** a los 30 días del primer pedido\n3. **Bundle de productos** — Ofrecé sets con descuento para subir el ticket promedio\n4. **Contenido educativo** — Posts sobre uso de productos que generen confianza\n5. **Programa de referidos** — Descuento por recomendar a un amigo\n\n¿Te gustaría que desarrolle alguna de estas ideas?`;
    } else if (lower.includes("pedido") || lower.includes("envío") || lower.includes("tracking")) {
      response = `📦 **Sobre gestión de pedidos:**\n\nTu sistema actual tiene:\n- ✅ Checkout real con Mercado Pago\n- ✅ Fulfillment completo (preparando → enviado → entregado)\n- ✅ Tracking en tiempo real\n- ✅ Emails transaccionales automáticos\n- ✅ Cancelaciones con guards de seguridad\n\nTodo está operativo. ¿Necesitás ayuda con algún pedido en particular o querés optimizar algún flujo?`;
    } else if (lower.includes("tienda") || lower.includes("store") || lower.includes("home")) {
      response = `🏪 **Análisis de tu tienda:**\n\nTu storefront tiene una estructura sólida con:\n- Hero principal con CTA\n- Productos destacados\n- Beneficios de marca\n- Testimonios de clientes\n- FAQ\n- Newsletter\n\n**Recomendaciones:**\n1. Asegurate de que las imágenes de producto sean de alta calidad\n2. El hero debe actualizarse cada temporada\n3. Agregá categorías si tenés más de 10 productos\n\n¿Querés que te sugiera mejoras para alguna sección?`;
    } else if (lower.includes("hola") || lower.includes("ayuda") || lower.includes("qué pued")) {
      response = `👋 ¡Hola! Soy el asistente IA de Nexora.\n\nPuedo ayudarte con:\n\n- 📝 **Catálogo** — Mejorar descripciones, títulos, SEO de productos\n- 🏪 **Tienda** — Optimizar home, hero, bloques, navegación\n- 📊 **Marketing** — Ideas de campañas, promos, contenido\n- 📦 **Pedidos** — Consultas sobre envíos, tracking, estado\n- 💡 **Conversión** — Tips para vender más\n- ❓ **Soporte** — Generar FAQs, respuestas tipo\n\n¿En qué te puedo ayudar?`;
    } else {
      response = `Entendido. Basándome en el contexto de tu tienda, te sugiero:\n\n1. Revisá que todos tus productos tengan descripciones completas\n2. Asegurate de tener al menos 3-5 reseñas visibles\n3. Configurá emails de carrito abandonado si aún no lo hiciste\n\n¿Querés que profundice en alguno de estos puntos?`;
    }

    const promptTokens = messages.reduce((acc, m) => acc + Math.ceil(m.content.length / 4), 0);
    const responseTokens = Math.ceil(response.length / 4);

    return {
      content: response,
      tokensUsed: { prompt: promptTokens, response: responseTokens, total: promptTokens + responseTokens },
    };
  },
};
