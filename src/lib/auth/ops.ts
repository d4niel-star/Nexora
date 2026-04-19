// ─── Ops-only gate ───
//
// Nexora does not model a super-admin role in the DB. The billing
// observability surface (`/admin/billing/observability`) aggregates data
// across ALL tenants — platform-wide subscription status counts,
// revenue and dunning metrics, plan changes per store — which is
// strictly internal Nexora ops data. If that surface is served to any
// authenticated store owner, it's a multi-tenant data leak.
//
// To keep the existing admin shell without introducing a DB role
// migration, we gate ops surfaces via an env allowlist. An empty or
// unset allowlist means "nobody is ops" (fail-closed): in production
// this effectively hides the surface until the env is explicitly set.
//
// Environment:
//   NEXORA_OPS_EMAILS  comma-separated allowlist of user emails that
//                      may access ops surfaces. Case-insensitive.
//                      Leave unset to disable the surface entirely.

import { getCurrentUser } from "./session";

function parseAllowlist(): Set<string> {
  const raw = process.env.NEXORA_OPS_EMAILS || "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0),
  );
}

/** Returns true when the given email is in NEXORA_OPS_EMAILS. */
export function isOpsEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allow = parseAllowlist();
  if (allow.size === 0) return false;
  return allow.has(email.trim().toLowerCase());
}

/**
 * Resolves the current authenticated user and returns true only when
 * their email matches the NEXORA_OPS_EMAILS allowlist. Never throws;
 * returns false for unauthenticated callers.
 */
export async function isCurrentUserOps(): Promise<boolean> {
  const user = await getCurrentUser();
  return isOpsEmail(user?.email);
}

/**
 * Throws when the caller is not in the ops allowlist. Use at the top
 * of server actions that expose cross-tenant data. The thrown Error is
 * intentionally generic so non-ops users don't learn the surface exists.
 */
export async function requireOpsUser(): Promise<void> {
  if (!(await isCurrentUserOps())) {
    throw new Error("not_found");
  }
}
