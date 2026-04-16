import { Resend } from "resend";
import { EmailProvider, EmailPayload } from "../types";

// ---------------------------------------------------------------------------
// Real provider: Resend (https://resend.com)
// Requires env: RESEND_API_KEY, RESEND_FROM_EMAIL
// ---------------------------------------------------------------------------
export class ResendProvider implements EmailProvider {
  name = "resend";
  private client: Resend;
  private from: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("[ResendProvider] RESEND_API_KEY is not set.");
    this.client = new Resend(apiKey);
    this.from = process.env.RESEND_FROM_EMAIL || "Nexora <noreply@nexora.app>";
  }

  async send(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.client.emails.send({
        from: this.from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        ...(payload.text ? { text: payload.text } : {}),
      });

      if (error) {
        console.error("[ResendProvider] API error:", error);
        return { success: false, error: error.message || "Resend API error" };
      }

      return { success: true };
    } catch (err: any) {
      console.error("[ResendProvider] Send failed:", err);
      return { success: false, error: err.message || "Unknown Resend error" };
    }
  }
}

// ---------------------------------------------------------------------------
// Development fallback: logs to console, never delivers real email.
// Active only when RESEND_API_KEY is absent.
// ---------------------------------------------------------------------------
export class MockProvider implements EmailProvider {
  name = "mock";

  async send(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
    console.log("---------------------------------------------------------");
    console.log(`[MOCK EMAIL] To: ${payload.to}`);
    console.log(`[MOCK EMAIL] Subject: ${payload.subject}`);
    console.log(`[MOCK EMAIL] HTML length: ${payload.html.length} chars`);
    console.log("---------------------------------------------------------");
    return { success: true };
  }
}

// ---------------------------------------------------------------------------
// Factory: resolves the active provider based on environment configuration.
//
// Production: set RESEND_API_KEY and optionally RESEND_FROM_EMAIL.
// Development: leave RESEND_API_KEY unset → falls back to MockProvider.
// ---------------------------------------------------------------------------
export function getEmailProvider(): EmailProvider {
  if (process.env.RESEND_API_KEY) {
    return new ResendProvider();
  }

  console.warn("[Email] RESEND_API_KEY not set — using MockProvider (emails will NOT be delivered).");
  return new MockProvider();
}
