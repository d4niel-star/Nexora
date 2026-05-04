import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import type { User, Store } from "@prisma/client";
import { randomBytes } from "crypto";

const SESSION_COOKIE_NAME = "nx_session";

export async function createSession(userId: string): Promise<string> {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  const token = randomBytes(32).toString("hex");
  
  const session = await prisma.session.create({
    data: {
      id: token,
      userId,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  return session.id;
}

export async function clearSession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionId) {
    await prisma.session.deleteMany({
      where: { id: sessionId },
    });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      user: true,
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  // Rolling expiration: extend session if it has less than 15 days remaining.
  // The DB update is the source of truth; the cookie expiry update is a UX
  // nicety so the browser keeps the cookie alive in sync. In Next 16 a Server
  // Component context cannot mutate cookies — that operation is reserved for
  // Server Actions / Route Handlers / Middleware. We swallow the throw here so
  // RSC callers (e.g. admin layout) never 500 when the rolling window fires;
  // the next Server Action / middleware roundtrip will refresh the cookie.
  const fifteenDays = 15 * 24 * 60 * 60 * 1000;
  if (session.expiresAt.getTime() - Date.now() < fifteenDays) {
    const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: newExpiresAt },
    });
    try {
      cookieStore.set(SESSION_COOKIE_NAME, session.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: newExpiresAt,
        path: "/",
      });
    } catch {
      // Read-only context (RSC). DB row already extended; nothing else to do.
    }
  }

  return session.user;
}

export async function getCurrentStore(): Promise<Store | null> {
  const user = await getCurrentUser();
  if (!user || !user.storeId) return null;

  return prisma.store.findUnique({
    where: { id: user.storeId },
  });
}
