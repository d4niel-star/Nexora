import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

// ─── Staff Invitation Tokens ─────────────────────────────────────────
// Raw token: 32 bytes URL-safe (base64url, ~43 chars).
// Stored: SHA-256 hex of the raw token. Comparison is timing-safe.
//
// Why hash? If the StaffInvitation table ever leaks, raw tokens are
// useless — invariant: server only ever stores the hash, the link in
// the email is the only place the raw token exists.

export function generateInviteToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

export function hashInviteToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Timing-safe comparison of two SHA-256 hex hashes (each 64 chars).
 * Both inputs MUST be the same length; mismatched lengths short-circuit
 * to false without leaking any timing info beyond the length itself.
 */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}
