// ─── WhatsApp Recovery · Meta Cloud API provider ───
// Thin wrapper over https://graph.facebook.com for sending a single
// approved-template message. Fail-safe: any error is returned in a
// discriminated result union; the caller (cron helper) is responsible for
// degrading and logging.

export interface WhatsappSendInput {
  phoneNumberId: string;
  accessToken: string;
  templateName: string;
  templateLanguage: string;
  /** Recipient in E.164 (+5491112345678). The caller must normalise. */
  toPhone: string;
  /** One-shot variables rendered into the WABA template body. */
  bodyParams?: string[];
}

export type WhatsappSendResult =
  | { success: true; messageId: string }
  | { success: false; error: string };

const GRAPH_BASE = "https://graph.facebook.com";
const GRAPH_VERSION = "v20.0";

/**
 * Normalise an Argentine phone into E.164 without the `+` prefix (WhatsApp
 * API expects `5491112345678`, no leading +). Returns null when the input
 * does not look like a valid AR phone we can route.
 */
export function normaliseArPhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = input.replace(/[^\d]/g, "");
  if (!digits) return null;
  if (digits.startsWith("54") && digits.length >= 12) return digits;
  if (digits.startsWith("0")) {
    const rest = digits.slice(1);
    if (rest.length >= 10) return `54${rest}`;
  }
  if (digits.length === 10) return `54${digits}`;
  return null;
}

export async function sendTemplateMessage(
  input: WhatsappSendInput,
): Promise<WhatsappSendResult> {
  const url = `${GRAPH_BASE}/${GRAPH_VERSION}/${input.phoneNumberId}/messages`;

  const body: Record<string, unknown> = {
    messaging_product: "whatsapp",
    to: input.toPhone,
    type: "template",
    template: {
      name: input.templateName,
      language: { code: input.templateLanguage },
    },
  };

  if (input.bodyParams && input.bodyParams.length > 0) {
    (body.template as Record<string, unknown>).components = [
      {
        type: "body",
        parameters: input.bodyParams.map((text) => ({ type: "text", text })),
      },
    ];
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      // Cron context — never cache.
      cache: "no-store",
    });

    const payload = (await res.json().catch(() => null)) as
      | { messages?: Array<{ id: string }>; error?: { message?: string; code?: number } }
      | null;

    if (!res.ok) {
      const msg =
        payload?.error?.message ||
        `graph_api_${res.status}`;
      return { success: false, error: msg };
    }

    const messageId = payload?.messages?.[0]?.id;
    if (!messageId) {
      return { success: false, error: "no_message_id_in_response" };
    }
    return { success: true, messageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "network_error";
    return { success: false, error: message };
  }
}
