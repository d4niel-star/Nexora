import { Resend } from "resend";
import { EmailProvider, EmailPayload } from "../types";

// ---------------------------------------------------------------------------
// Remitente: preferir RESEND_FROM_EMAIL; aceptar EMAIL_FROM como alias para
// mantener compatibilidad con guías de deploy que usan el nombre genérico.
// Si ninguno está seteado, caer a un literal seguro — pero `getEmailProvider`
// igualmente exige RESEND_API_KEY en producción, así que este literal solo
// aparece en dev.
// ---------------------------------------------------------------------------
export function resolveEmailFromAddress(): string {
  return (
    process.env.RESEND_FROM_EMAIL ||
    process.env.EMAIL_FROM ||
    "Nexora <noreply@nexora.app>"
  );
}

// ---------------------------------------------------------------------------
// Real provider: Resend (https://resend.com)
// Requires env: RESEND_API_KEY; from address via RESEND_FROM_EMAIL or EMAIL_FROM
// ---------------------------------------------------------------------------
export class ResendProvider implements EmailProvider {
  name = "resend";
  private client: Resend;
  private from: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("[ResendProvider] RESEND_API_KEY is not set.");
    this.client = new Resend(apiKey);
    this.from = resolveEmailFromAddress();
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
// Production: RESEND_API_KEY is REQUIRED. If missing we throw instead of
//   silently swapping to MockProvider — previously every email would be
//   logged as `sent` with provider=mock while nothing ever reached the
//   customer. Callers (crons, webhooks, server actions) that invoke this
//   factory surface the failure explicitly, which is what we want:
//   operators see the misconfiguration the first time an email is
//   scheduled, not weeks later when a customer complains.
// Development / test: MockProvider is allowed when RESEND_API_KEY is
//   absent, logging a loud warning the first time it is used.
// ---------------------------------------------------------------------------
export class MissingEmailApiKeyError extends Error {
  constructor() {
    super(
      "RESEND_API_KEY is not set. Refusing to fall back to MockProvider in " +
        "production — that silently drops every transactional email. Set " +
        "RESEND_API_KEY in the production environment before deploying.",
    );
    this.name = "MissingEmailApiKeyError";
  }
}

let mockWarnEmitted = false;

export function getEmailProvider(): EmailProvider {
  if (process.env.RESEND_API_KEY) {
    return new ResendProvider();
  }

  if (process.env.NODE_ENV === "production") {
    throw new MissingEmailApiKeyError();
  }

  if (!mockWarnEmitted) {
    mockWarnEmitted = true;
    console.warn(
      "[Email] RESEND_API_KEY not set — using MockProvider (emails will NOT be delivered). " +
        "This is only permitted in development; production will throw.",
    );
  }
  return new MockProvider();
}
