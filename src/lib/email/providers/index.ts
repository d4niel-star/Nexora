import { EmailProvider, EmailPayload } from "../types";

export class MockProvider implements EmailProvider {
  name = "mock";

  async send(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
    console.log("---------------------------------------------------------");
    console.log(`[MOCK EMAIL PROVIDER] Sending email to: ${payload.to}`);
    console.log(`[MOCK EMAIL PROVIDER] Subject: ${payload.subject}`);
    console.log(`[MOCK EMAIL PROVIDER] Content length: ${payload.html.length} chars`);
    console.log("---------------------------------------------------------");
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { success: true };
  }
}

// In the future, this could be:
// export class ResendProvider implements EmailProvider { ... }

export function getEmailProvider(): EmailProvider {
  // Can be configured via environment variables
  // e.g. if (process.env.RESEND_API_KEY) return new ResendProvider();
  
  return new MockProvider();
}
