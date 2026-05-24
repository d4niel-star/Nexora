import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { hashInviteToken } from "@/lib/staff/tokens";
import { InviteAcceptClient } from "./InviteAcceptClient";

// ─── /invite/[token] ─────────────────────────────────────────────────
// Public-ish landing page for staff invitations. The raw token is in the
// URL; the server hashes it and looks up the invitation.
//
// Outcomes:
//   - Invalid / expired / revoked / already-accepted → friendly error
//   - User not logged in → render a "Sign up or log in" card with a
//     return URL so they come back here after auth
//   - User logged in but email mismatch → reject (forwarded link guard)
//   - Valid + matching → render Accept button (calls acceptInviteAction)

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function InviteAcceptPage({ params }: PageProps) {
  const { token } = await params;
  if (!token || token.length < 16) {
    return <ErrorCard title="Enlace inválido" message="El enlace no es válido." />;
  }

  const tokenHash = hashInviteToken(token);
  const inv = await prisma.staffInvitation.findUnique({
    where: { tokenHash },
  });

  if (!inv) {
    return <ErrorCard title="Invitación no encontrada" message="El enlace no corresponde a una invitación válida." />;
  }
  if (inv.revokedAt) {
    return <ErrorCard title="Invitación revocada" message="La invitación fue revocada por un administrador." />;
  }
  if (inv.acceptedAt) {
    return <ErrorCard title="Ya aceptada" message="Esta invitación ya fue utilizada." />;
  }
  if (inv.expiresAt < new Date()) {
    return <ErrorCard title="Invitación expirada" message="El enlace ya expiró. Pediles a tu administrador que reenvíe la invitación." />;
  }

  // Look up store name for the UX
  const store = await prisma.store.findUnique({
    where: { id: inv.storeId },
    select: { name: true },
  });

  const user = await getCurrentUser();

  if (!user) {
    // Not logged in — point them to login with a returnTo
    const returnTo = encodeURIComponent(`/invite/${token}`);
    return (
      <Shell>
        <h1 className="text-[20px] font-semibold text-ink-0">Invitación a {store?.name ?? "Nexora"}</h1>
        <p className="mt-2 text-[13px] text-ink-4">
          Te invitaron a unirte como <strong>{inv.role}</strong>. Iniciá sesión con
          el email <strong>{inv.email}</strong> para aceptar.
        </p>
        <div className="mt-6 flex gap-2">
          <Link
            href={`/home/login?returnTo=${returnTo}`}
            className="inline-flex items-center justify-center rounded-full bg-ink-0 px-5 py-2.5 text-[13px] font-medium text-ink-12 hover:bg-ink-2"
          >
            Iniciar sesión
          </Link>
          <Link
            href={`/home/register?email=${encodeURIComponent(inv.email)}&returnTo=${returnTo}`}
            className="inline-flex items-center justify-center rounded-full border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-5 py-2.5 text-[13px] font-medium text-ink-0 hover:bg-[var(--surface-2)]"
          >
            Crear cuenta
          </Link>
        </div>
      </Shell>
    );
  }

  if (user.email.toLowerCase() !== inv.email.toLowerCase()) {
    return (
      <ErrorCard
        title="Email distinto"
        message={`Esta invitación es para ${inv.email}. Estás logueado con ${user.email}. Cerrá sesión y volvé a entrar con el email correcto.`}
      />
    );
  }

  // All good — show accept button (client component because action is dynamic)
  return (
    <Shell>
      <h1 className="text-[20px] font-semibold text-ink-0">Invitación a {store?.name ?? "Nexora"}</h1>
      <p className="mt-2 text-[13px] text-ink-4">
        Estás por unirte como <strong>{inv.role}</strong>.
      </p>
      <InviteAcceptClient token={token} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--surface-1)] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-8 shadow-[var(--shadow-soft)]">
        {children}
      </div>
    </div>
  );
}

function ErrorCard({ title, message }: { title: string; message: string }) {
  return (
    <Shell>
      <h1 className="text-[18px] font-semibold text-ink-0">{title}</h1>
      <p className="mt-2 text-[13px] text-ink-4">{message}</p>
      <Link
        href="/admin/dashboard"
        className="mt-6 inline-flex items-center justify-center rounded-full bg-ink-0 px-4 py-2 text-[12px] font-medium text-ink-12"
      >
        Ir al panel
      </Link>
    </Shell>
  );
}
