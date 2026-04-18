// ─── Server-side analytics beacon ───
// Fires conversion events (purchase, begin_checkout, add_to_cart) to Google
// Analytics 4 via the Measurement Protocol when the env vars are set.
// If either `GA_MEASUREMENT_ID` or `GA_MEASUREMENT_PROTOCOL_SECRET` is missing,
// the helper is a silent no-op — no errors, no console noise.
//
// Wire additional providers here (Meta Conversions API, Segment, Posthog) by
// adding another branch — the public API (`trackServerEvent`) stays the same.

interface ServerEventParams {
  clientId: string; // stable per-session id (e.g. cart sessionId)
  name: string; // GA4 event name (purchase, begin_checkout, add_to_cart...)
  params?: Record<string, unknown>;
}

export async function trackServerEvent(event: ServerEventParams): Promise<void> {
  const gaId = process.env.GA_MEASUREMENT_ID;
  const gaSecret = process.env.GA_MEASUREMENT_PROTOCOL_SECRET;

  if (!gaId || !gaSecret) return; // unconfigured, skip

  try {
    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(
      gaId,
    )}&api_secret=${encodeURIComponent(gaSecret)}`;

    await fetch(url, {
      method: "POST",
      body: JSON.stringify({
        client_id: event.clientId,
        events: [{ name: event.name, params: event.params ?? {} }],
      }),
      // GA4 expects < 1s responses; don't block request handlers.
      keepalive: true,
    });
  } catch (err) {
    // Never break commerce flow on analytics failure.
    console.warn("[analytics] trackServerEvent failed", err);
  }
}
