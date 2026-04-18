"use server";

import { prisma } from "@/lib/db/prisma";
import { createSession, clearSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { validatePasswordPolicy } from "@/lib/auth/password-policy";
import { createAndSendVerificationEmail, resendVerificationEmail } from "@/lib/auth/verification";
import { normalizeSlug } from "@/lib/store-engine/slug";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash.includes(":")) return false; // Strictly reject legacy plaintext
  const [salt, key] = storedHash.split(":");
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = scryptSync(password, salt, 64);
  return timingSafeEqual(keyBuffer, derivedKey);
}

async function generateUniqueStoreSlug(companyName: string): Promise<string> {
  const normalized = normalizeSlug(companyName);
  const base = (normalized.length > 60 ? normalized.slice(0, 60).replace(/-+$/g, "") : normalized) || `tienda-${randomBytes(3).toString("hex")}`;
  let slug = base;
  let suffix = 2;

  while (await prisma.store.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

export async function loginAction(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Faltan credenciales" };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user || !verifyPassword(password, user.password)) {
    return { error: "Credenciales incorrectas" };
  }

  // Block unverified users — do NOT create session
  if (!user.emailVerified) {
    return {
      error: "Tu email aún no fue verificado. Revisá tu bandeja de entrada o solicitá un nuevo enlace.",
      needsVerification: true,
      userId: user.id,
    };
  }

  await createSession(user.id);
  
  // Navigate to gateway directly.
  redirect("/welcome/gate");
}

export async function registerAction(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  const companyName = formData.get("name") as string;

  if (!email || !password || !companyName) {
    return { error: "Todos los campos son requeridos." };
  }

  // Password confirmation
  if (password !== confirmPassword) {
    return { error: "Las contraseñas no coinciden." };
  }

  // Server-side password policy enforcement
  const policyResult = validatePasswordPolicy(password, { email, companyName });
  if (!policyResult.valid) {
    return { error: policyResult.errors[0] };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "El email ya está registrado." };
  }

  // Create Store + User at the same time with deterministic uniqueness.
  const slug = await generateUniqueStoreSlug(companyName);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashPassword(password),
      name: companyName,
      emailVerified: false,
      store: {
        create: {
          slug,
          name: companyName,
          status: "draft",
          onboarding: {
            create: {
              currentStage: "welcome",
            }
          }
        }
      }
    }
  });

  // Send verification + welcome email (non-blocking — don't fail registration if email fails)
  createAndSendVerificationEmail(user.id, user.email, companyName).catch((err) => {
    console.error("[Register] Failed to send verification email:", err);
  });

  // DO NOT create session — user must verify email first
  // Redirect to a confirmation page
  redirect("/home/check-email");
}

export async function resendVerificationAction(prevState: any, formData: FormData) {
  const userId = formData.get("userId") as string;

  if (!userId) {
    return { error: "Datos insuficientes para reenviar." };
  }

  const result = await resendVerificationEmail(userId);

  if (result.success) {
    return { success: true, message: "Correo de verificación reenviado. Revisá tu bandeja." };
  }

  return { error: result.error || "No se pudo reenviar el correo." };
}

export async function logoutAction() {
  await clearSession();
  redirect("/home/login");
}
