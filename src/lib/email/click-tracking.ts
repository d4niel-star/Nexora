// ─── Email click tracking (V3.3) ───
// Small, explicit helpers shared by sendEmailEvent and the redirect route.
// - buildTrackedUrl wraps a real destination with /api/r/[id]
// - resolveAppOrigin returns the canonical origin used as the anti-open-
//   redirect allowlist.
//
// Design notes
// ------------
// 1. Only ONE app wraps its CTA today (post-purchase-flows). The helper is
//    generic so we can extend to other email templates later without
//    rebuilding the tracker.
// 2. We never wrap non-http(s) destinations (mailto:, tel:, anchors) — those
//    do not round-trip through fetch anyway and would silently break.

/**
 * Canonical app origin used to both emit tracked URLs and validate incoming
 * `to` params. Reads NEXT_PUBLIC_APP_URL; the cron already uses the same
 * env with the same fallback, so wrapping is consistent with the rest of
 * the system.
 */
export function resolveAppOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

/**
 * Wrap a real destination URL with the tracking redirect.
 *   buildTrackedUrl("abc-uuid", "https://app.example.com/store/x/tracking?...")
 *   -> "https://app.example.com/api/r/abc-uuid?to=<encoded>"
 *
 * Returns the original URL unchanged when it is not http(s) or when the
 * id is falsy — fail-open on the user-visible side: a non-trackable link
 * must still work.
 */
export function buildTrackedUrl(emailLogId: string, destination: string): string {
  if (!emailLogId || !destination) return destination;
  if (!/^https?:\/\//i.test(destination)) return destination;

  const origin = resolveAppOrigin();
  const encoded = encodeURIComponent(destination);
  return `${origin}/api/r/${emailLogId}?to=${encoded}`;
}

/**
 * Validates that a destination is safe to redirect to from /api/r/. Only
 * accepts URLs whose origin matches resolveAppOrigin(), i.e. our own app.
 * This rules out "javascript:", relative paths, foreign domains, and
 * protocol-relative shenanigans — classic open-redirect vectors.
 */
export function isAllowedRedirect(destination: string): boolean {
  if (!destination) return false;
  let parsed: URL;
  try {
    parsed = new URL(destination);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;

  let app: URL;
  try {
    app = new URL(resolveAppOrigin());
  } catch {
    return false;
  }
  // Strict same-origin match: host + protocol + port must agree. This is
  // intentionally conservative — if a tenant uses a custom domain we will
  // extend the allowlist later with an explicit list, never inferred.
  return parsed.origin === app.origin;
}
