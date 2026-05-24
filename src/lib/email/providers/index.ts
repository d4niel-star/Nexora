import { Resend } from "resend";
import { EmailProvider, EmailPayload } from "../types";
import { getCircuitBreaker, CircuitBreakerOpenError } from "@/lib/resilience/circuit-breaker";

// Phase 7B.5 — circuit-break the Resend provider. If the API has been
// unreachable / erroring for 5 consecutive sends, the breaker opens for
// 60s and we fail fast instead of compounding the outage.
const resendBreaker = getCircuitBreaker({
  name: "email_resend",
  failureThreshold: 5,
  cooldownMs: 60_000,
});

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
      // The circuit breaker counts thrown errors as failures, so we
      // re-throw on Resend `error` payloads to record a failure. The
      // catch below normalizes the response shape for callers.
      await resendBreaker.exec(async () => {
        const { error } = await this.client.emails.send({
          from: this.from,
          to: payload.to,
          subject: payload.subject,
          html: payload.html,
          ...(payload.text ? { text: payload.text } : {}),
        });
        if (error) {
          throw new Error(error.message || "Resend API error");
        }
      });
      return { success: true };
    } catch (err: any) {
      if (err instanceof CircuitBreakerOpenError) {
        // Fast-fail because the breaker is open — surface a typed message.
        return { success: false, error: `email_provider_circuit_open:${err.retryAfterMs}ms` };
      }
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
