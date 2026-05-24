"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptInviteAction } from "@/lib/staff/actions";

export function InviteAcceptClient({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [accepted, setAccepted] = useState(false);

  const onAccept = () => {
    setError(null);
    startTransition(async () => {
      try {
        await acceptInviteAction(token);
        setAccepted(true);
        // Small delay so the user sees the success state, then redirect
        setTimeout(() => router.push("/admin/dashboard"), 1200);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No pudimos aceptar la invitación.");
      }
    });
  };

  if (accepted) {
    return (
      <div className="mt-6 rounded-[var(--r-md)] border border-[color:var(--signal-success)]/30 bg-[color:var(--signal-success)]/5 p-3 text-[13px] text-[color:var(--signal-success)]">
        Listo. Te redirigimos al panel...
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {error && (
        <div className="rounded-[var(--r-md)] border border-[color:var(--signal-danger)]/30 bg-[color:var(--signal-danger)]/5 p-3 text-[12px] text-[color:var(--signal-danger)]">
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={onAccept}
        disabled={isPending}
        className="inline-flex items-center justify-center rounded-full bg-ink-0 px-5 py-2.5 text-[13px] font-medium text-ink-12 hover:bg-ink-2 disabled:opacity-50"
      >
        {isPending ? "Aceptando..." : "Aceptar invitación"}
      </button>
    </div>
  );
}
