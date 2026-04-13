import { cookies } from "next/headers";

const CART_TOKEN_COOKIE = "nexora_cart_session";

/**
 * Gets the current session ID from cookies.
 * Returns null if no session exists yet (read-only, safe for Server Components).
 */
export async function getSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CART_TOKEN_COOKIE)?.value ?? null;
}

/**
 * Gets an existing session ID or creates a new one.
 * ONLY call this from Server Actions (mutations), never from Server Components.
 */
export async function getOrCreateSessionId(): Promise<string> {
  const cookieStore = await cookies();
  const existingId = cookieStore.get(CART_TOKEN_COOKIE)?.value;
  
  if (existingId) {
    return existingId;
  }

  const newId = crypto.randomUUID();
  cookieStore.set(CART_TOKEN_COOKIE, newId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  return newId;
}
