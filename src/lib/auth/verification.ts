import { prisma } from "@/lib/db/prisma";
import { randomBytes } from "crypto";
import { getEmailProvider } from "@/lib/email/providers";
import {
  generateEmailVerificationTemplate,
  generateEmailVerificationResendTemplate,
} from "@/lib/email/templates/auth";

const TOKEN_EXPIRY_HOURS = 24;
const RESEND_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes between resends

/**
 * Creates a verification token for a user and sends the verification email.
 * Called once at registration time.
 */
export async function createAndSendVerificationEmail(
  userId: string,
  email: string,
  userName: string
): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  await prisma.emailVerificationToken.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const verifyUrl = `${appUrl}/api/auth/verify-email?token=${token}`;

  const html = generateEmailVerificationTemplate({ userName, verifyUrl });

  const provider = getEmailProvider();
  const result = await provider.send({
    to: email,
    subject: "Verificá tu email — Nexora",
    html,
    text: `Bienvenido a Nexora, ${userName}. Verificá tu email visitando: ${verifyUrl} — Este enlace expira en 24 horas.`,
  });

  if (!result.success) {
    console.error("[Auth] Failed to send verification email to", email, result.error);
  }
}

/**
 * Resends verification email with rate-limiting protection.
 * Invalidates previous unused tokens and creates a new one.
 */
export async function resendVerificationEmail(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { success: false, error: "Usuario no encontrado." };
  if (user.emailVerified) return { success: false, error: "El email ya está verificado." };

  // Rate limiting: check last token creation time
  const lastToken = await prisma.emailVerificationToken.findFirst({
    where: { userId, usedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (lastToken && Date.now() - lastToken.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    return { success: false, error: "Esperá unos minutos antes de solicitar otro correo." };
  }

  // Invalidate all existing unused tokens for this user
  await prisma.emailVerificationToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() }, // Mark as consumed so they can't be reused
  });

  // Create fresh token
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  await prisma.emailVerificationToken.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const verifyUrl = `${appUrl}/api/auth/verify-email?token=${token}`;

  const html = generateEmailVerificationResendTemplate({
    userName: user.name || "",
    verifyUrl,
  });

  const provider = getEmailProvider();
  const result = await provider.send({
    to: user.email,
    subject: "Verificá tu email — Nexora",
    html,
    text: `Hola ${user.name || ""}. Verificá tu email en Nexora visitando: ${verifyUrl} — Este enlace expira en 24 horas.`,
  });

  if (!result.success) {
    console.error("[Auth] Failed to resend verification email to", user.email, result.error);
    return { success: false, error: "No se pudo enviar el correo. Intentá de nuevo." };
  }

  return { success: true };
}

/**
 * Consumes a verification token and marks the user's email as verified.
 * Returns the result for the route handler.
 */
export async function consumeVerificationToken(
  token: string
): Promise<{ success: boolean; error?: string; userId?: string }> {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!record) {
    return { success: false, error: "El enlace de verificación no es válido." };
  }

  if (record.usedAt) {
    // Token already used — check if user is already verified
    if (record.user.emailVerified) {
      return { success: true, userId: record.userId }; // Idempotent: already verified
    }
    return { success: false, error: "Este enlace ya fue utilizado. Solicitá uno nuevo desde el login." };
  }

  if (record.expiresAt.getTime() < Date.now()) {
    return { success: false, error: "El enlace de verificación expiró. Solicitá uno nuevo desde el login." };
  }

  // Mark token as used and user as verified in a transaction
  await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: true },
    }),
  ]);

  return { success: true, userId: record.userId };
}
