import { prisma } from "@/lib/db/prisma";
import { getEmailProvider } from "@/lib/email/providers";

// ─── Staff Invitation Email ──────────────────────────────────────────
// Plain transactional email — uses the same Resend pipeline that powers
// every other email in Nexora. The link contains the raw token; the
// hashed copy is what's stored in the DB.

interface SendInviteParams {
  to: string;
  storeId: string;
  token: string;
  role: string;
}

function getAppOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  manager: "Gerente",
  support: "Soporte",
  analyst: "Analista",
};

export async function sendStaffInviteEmail(params: SendInviteParams): Promise<void> {
  const store = await prisma.store.findUnique({
    where: { id: params.storeId },
    select: { name: true },
  });
  const storeName = store?.name ?? "Nexora";
  const link = `${getAppOrigin()}/invite/${encodeURIComponent(params.token)}`;
  const roleLabel = ROLE_LABELS[params.role] ?? params.role;

  const subject = `Te invitaron al equipo de ${storeName}`;
  const html = `
<div style="font-family: -apple-system, system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #0f172a;">
  <h1 style="margin: 0 0 16px; font-size: 22px;">Invitación al equipo de ${escapeHtml(storeName)}</h1>
  <p style="font-size: 14px; line-height: 1.6;">
    Te invitaron a colaborar en <strong>${escapeHtml(storeName)}</strong> con el rol de
    <strong>${escapeHtml(roleLabel)}</strong>.
  </p>
  <p style="font-size: 14px; line-height: 1.6;">
    El enlace es válido por 72 horas y solo puede usarse una vez.
  </p>
  <p style="margin: 32px 0;">
    <a href="${link}" style="display: inline-block; background: #000020; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
      Aceptar invitación
    </a>
  </p>
  <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin-top: 32px;">
    Si no esperabas esta invitación, podés ignorar este email — el enlace expirará automáticamente.
  </p>
</div>
  `.trim();

  const text = `Te invitaron al equipo de ${storeName} con el rol de ${roleLabel}. Aceptá la invitación en: ${link} (válido 72hs, un solo uso).`;

  const provider = getEmailProvider();
  await provider.send({
    to: params.to,
    subject,
    html,
    text,
  });
}
