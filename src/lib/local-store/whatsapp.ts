// WhatsApp deep-link helper for the merchant's pickup workflow.
//
// Nexora does NOT integrate with the WhatsApp Business API: every
// "send WhatsApp" affordance in the system is a wa.me deep link that
// opens the merchant's own WhatsApp client with a pre-filled message.
// We do the heavy lifting (digits-only phone, encoded message,
// fallback if the customer left no phone) here so the UI can stay
// declarative and never serialise raw phone numbers into a string
// concatenation by hand.

export interface PickupWhatsAppPayload {
  customerName: string | null;
  customerPhone: string | null;
  orderNumber: string;
  // Public local context (already validated by getPublicPickupInfo on
  // the server side). All optional: missing pieces are simply skipped.
  localName: string;
  address: string | null;
  hoursSummary: string | null;
  instructions: string | null;
  googleMapsUrl: string | null;
}

export interface PickupWhatsAppResult {
  available: boolean;
  // The fully formed wa.me URL, or null when there is no phone we can
  // safely target.
  url: string | null;
  reason?: "no_phone" | "phone_too_short";
}

// Phone formatting policy:
//   - strip every non-digit
//   - require at least 8 digits (anything shorter is almost certainly
//     mis-typed — area-code-only or numeric noise)
// We do NOT prepend a country code: wa.me accepts E.164 without "+",
// and assuming AR (54) for an unknown phone could open the buyer's
// chat in another country by accident.
function normalizePhone(input: string): string {
  return input.replace(/\D/g, "");
}

export function buildPickupWhatsAppLink(payload: PickupWhatsAppPayload): PickupWhatsAppResult {
  if (!payload.customerPhone || payload.customerPhone.trim() === "") {
    return { available: false, url: null, reason: "no_phone" };
  }
  const digits = normalizePhone(payload.customerPhone);
  if (digits.length < 8) {
    return { available: false, url: null, reason: "phone_too_short" };
  }

  const greeting = payload.customerName
    ? `Hola ${payload.customerName},`
    : "Hola,";

  // Compose the message line by line; skipping a line is cleaner than
  // ending the message with a stray "Dirección: undefined".
  const lines: string[] = [];
  lines.push(greeting);
  lines.push("");
  lines.push(
    `Tu pedido ${payload.orderNumber} ya está listo para retirar en ${payload.localName}.`,
  );
  if (payload.address) lines.push(`📍 ${payload.address}`);
  if (payload.hoursSummary) lines.push(`🕐 ${payload.hoursSummary}`);
  if (payload.instructions) {
    lines.push("");
    lines.push(payload.instructions);
  }
  if (payload.googleMapsUrl) {
    lines.push("");
    lines.push(`Ver en Maps: ${payload.googleMapsUrl}`);
  }
  lines.push("");
  lines.push("Te esperamos. ¡Gracias por tu compra!");

  const message = lines.join("\n");
  const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  return { available: true, url };
}
