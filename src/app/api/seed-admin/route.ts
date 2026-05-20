// ─── Temporary admin seed route ───
// Hit GET /api/seed-admin to create the admin user.
// DELETE THIS FILE after use — it's a one-time setup tool.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { scryptSync, randomBytes } from "crypto";
import { createSession } from "@/lib/auth/session";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

export async function GET() {
  const EMAIL = "admin@nexora.dev";
  const PASSWORD = "Nexora2026!";
  const STORE_NAME = "Nexora Demo Store";
  const STORE_SLUG = "nexora-demo";

  try {
    // Quick connectivity test with a simple query
    await prisma.$executeRawUnsafe("SELECT 1");

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email: EMAIL } });
    if (existing) {
      if (!existing.emailVerified) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { emailVerified: true },
        });
      }

      // Reset password to known value
      await prisma.user.update({
        where: { id: existing.id },
        data: { password: hashPassword(PASSWORD) },
      });

      // Create session so user is auto-logged in
      await createSession(existing.id);

      return NextResponse.json({
        status: "already_exists_reset",
        message: "User existed — password reset and session created. Redirect to /admin/dashboard",
        email: EMAIL,
        password: PASSWORD,
        storeId: existing.storeId,
      });
    }

    // Find or create store
    let store = await prisma.store.findUnique({ where: { slug: STORE_SLUG } });

    if (!store) {
      store = await prisma.store.create({
        data: {
          slug: STORE_SLUG,
          name: STORE_NAME,
          status: "active",
          currency: "ARS",
          locale: "es-AR",
          description: "Tienda demo de Nexora con acceso completo.",
          onboarding: {
            create: { currentStage: "completed" },
          },
        },
      });
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email: EMAIL,
        password: hashPassword(PASSWORD),
        name: "Admin",
        emailVerified: true,
        storeId: store.id,
      },
    });

    // Link ownership
    await prisma.store.update({
      where: { id: store.id },
      data: { ownerId: user.id },
    });

    // Create session so user is auto-logged in
    await createSession(user.id);

    return NextResponse.json({
      status: "created",
      message: "Admin created and logged in. Go to /admin/dashboard",
      email: EMAIL,
      password: PASSWORD,
      userId: user.id,
      storeSlug: store.slug,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: msg,
        hint: msg.includes("Connection")
          ? "La base de datos remota no acepta conexiones desde tu red. Intentá desde la app deployada en Render, o usá una DB local."
          : undefined,
      },
      { status: 500 },
    );
  }
}
