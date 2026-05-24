"use client";

import { useState, useTransition } from "react";
import { Users, UserPlus, Mail, Shield, Eye, Pause, Play, Trash2, RefreshCcw, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { NexoraPageHeader } from "@/components/admin/nexora";
import {
  inviteStaffAction,
  resendInviteAction,
  revokeInviteAction,
  changeRoleAction,
  suspendStaffAction,
  reactivateStaffAction,
  removeStaffAction,
} from "@/lib/staff/actions";
import type { StaffRow, InvitationRow } from "@/lib/staff/queries";

// ─── Team Management Client ──────────────────────────────────────────
// Every button is wired to a real server action. The UI hides actions
// the actor lacks permission for, but the actions re-validate on the
// server — UI hiding is courtesy, not security.

interface Capabilities {
  canInvite: boolean;
  canManage: boolean;
  canRemove: boolean;
}

interface Props {
  staff: StaffRow[];
  invitations: InvitationRow[];
  currentUserId: string;
  capabilities: Capabilities;
}

const ROLE_OPTIONS = [
  { value: "admin", label: "Administrador", desc: "Acceso operacional completo, sin destructivos." },
  { value: "manager", label: "Gerente", desc: "Catálogo, inventario, pedidos, automatizaciones." },
  { value: "support", label: "Soporte", desc: "Pedidos y clientes; sin escritura de catálogo." },
  { value: "analyst", label: "Analista", desc: "Solo lectura + exports." },
];

const ROLE_LABEL: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  manager: "Gerente",
  support: "Soporte",
  analyst: "Analista",
};

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  active: { label: "Activo", className: "bg-[color:var(--signal-success)]/10 text-[color:var(--signal-success)]" },
  invited: { label: "Invitado", className: "bg-[var(--surface-2)] text-ink-3" },
  suspended: { label: "Suspendido", className: "bg-[color:var(--signal-warning)]/10 text-[color:var(--signal-warning)]" },
  removed: { label: "Removido", className: "bg-[var(--surface-2)] text-ink-5" },
};

export function TeamPageClient({ staff, invitations, currentUserId, capabilities }: Props) {
  const [showInvite, setShowInvite] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const handle = (id: string, op: () => Promise<unknown>) => {
    setError(null);
    setBusyId(id);
    startTransition(async () => {
      try {
        await op();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error desconocido");
      } finally {
        setBusyId(null);
      }
    });
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      <NexoraPageHeader
        title="Equipo"
        subtitle="Invitá colaboradores con roles y permisos reales. Cada acción queda registrada en la línea de tiempo de auditoría."
      />

      {error && (
        <div className="rounded-[var(--r-md)] border border-[color:var(--signal-danger)]/30 bg-[color:var(--signal-danger)]/5 px-3 py-2 text-[12px] text-[color:var(--signal-danger)]">
          {error}
        </div>
      )}

      {/* ── Action Bar ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[13px] text-ink-5">
          <Users className="h-4 w-4" />
          {staff.length} {staff.length === 1 ? "miembro" : "miembros"}
          {invitations.length > 0 && <> · {invitations.length} pendiente{invitations.length === 1 ? "" : "s"}</>}
        </div>
        {capabilities.canInvite && (
          <button
            type="button"
            onClick={() => setShowInvite(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-ink-0 px-4 py-2 text-[12px] font-medium text-ink-12 hover:bg-ink-2"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Invitar
          </button>
        )}
      </div>

      {/* ── Staff Table ─── */}
      {staff.length === 0 ? (
        <EmptyState />
      ) : (
        <StaffTable
          rows={staff}
          currentUserId={currentUserId}
          capabilities={capabilities}
          busyId={busyId}
          onChangeRole={(id, role) => handle(id, () => changeRoleAction(id, role))}
          onSuspend={(id) => handle(id, () => suspendStaffAction(id))}
          onReactivate={(id) => handle(id, () => reactivateStaffAction(id))}
          onRemove={(id) => {
            if (window.confirm("¿Eliminar este miembro del equipo? La acción queda registrada.")) {
              handle(id, () => removeStaffAction(id));
            }
          }}
        />
      )}

      {/* ── Pending Invitations ─── */}
      {invitations.length > 0 && (
        <section>
          <h2 className="mb-3 text-[12px] font-medium uppercase tracking-[0.18em] text-ink-5">
            Invitaciones pendientes
          </h2>
          <InvitationsTable
            rows={invitations}
            canManage={capabilities.canInvite}
            busyId={busyId}
            onResend={(id) => handle(id, () => resendInviteAction(id))}
            onRevoke={(id) => handle(id, () => revokeInviteAction(id))}
          />
        </section>
      )}

      {/* ── Role descriptions ─── */}
      <RoleLegend />

      {/* ── Invite Modal ─── */}
      {showInvite && capabilities.canInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onSubmit={async (email, role) => {
            setError(null);
            try {
              await inviteStaffAction({ email, role });
              setShowInvite(false);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Error desconocido");
              throw e;
            }
          }}
          isPending={isPending}
        />
      )}
    </div>
  );
}

// ─── Subcomponents ───

function EmptyState() {
  return (
    <div className="rounded-[var(--r-lg)] border border-dashed border-[color:var(--hairline-strong)] bg-[var(--surface-0)] p-12 text-center">
      <Users className="mx-auto h-8 w-8 text-ink-6" strokeWidth={1.25} />
      <p className="mt-3 text-[14px] font-medium text-ink-3">Todavía no hay miembros en tu equipo.</p>
      <p className="mt-1 text-[12px] text-ink-5">Invitá colaboradores con permisos específicos para mantener tu operación segura.</p>
    </div>
  );
}

interface StaffTableProps {
  rows: StaffRow[];
  currentUserId: string;
  capabilities: Capabilities;
  busyId: string | null;
  onChangeRole: (memberId: string, role: string) => void;
  onSuspend: (memberId: string) => void;
  onReactivate: (memberId: string) => void;
  onRemove: (memberId: string) => void;
}

function StaffTable({ rows, currentUserId, capabilities, busyId, onChangeRole, onSuspend, onReactivate, onRemove }: StaffTableProps) {
  return (
    <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] overflow-hidden">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-[color:var(--hairline)] bg-[var(--surface-1)]">
            <th className="px-3 py-2.5 text-left font-medium text-ink-5">Miembro</th>
            <th className="px-3 py-2.5 text-left font-medium text-ink-5">Rol</th>
            <th className="px-3 py-2.5 text-left font-medium text-ink-5">Estado</th>
            <th className="px-3 py-2.5 text-right font-medium text-ink-5">Última actividad</th>
            <th className="px-3 py-2.5 text-right font-medium text-ink-5">Creado</th>
            {(capabilities.canManage || capabilities.canRemove) && (
              <th className="px-3 py-2.5 text-right font-medium text-ink-5">Acciones</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--hairline)]">
          {rows.map((m) => {
            const isSelf = m.userId === currentUserId;
            const isOwner = m.isOwner;
            const status = STATUS_LABEL[m.status] ?? STATUS_LABEL.active;
            const cannotMutate = isOwner || isSelf;
            return (
              <tr key={m.id} className="hover:bg-[var(--surface-1)] transition-colors">
                <td className="px-3 py-2.5">
                  <div className="font-medium text-ink-0">{m.name || m.email.split("@")[0]}</div>
                  <div className="text-ink-5">{m.email}</div>
                </td>
                <td className="px-3 py-2.5">
                  {capabilities.canManage && !cannotMutate && m.status !== "invited" ? (
                    <select
                      value={m.role}
                      disabled={busyId === m.id}
                      onChange={(e) => onChangeRole(m.id, e.target.value)}
                      className="rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-2 py-1 text-[12px] text-ink-0 outline-none focus-visible:shadow-[var(--shadow-focus)]"
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-ink-3">
                      {isOwner && <Shield className="h-3 w-3" />}
                      {ROLE_LABEL[m.role] ?? m.role}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <span className={cn("inline-flex items-center rounded-[var(--r-xs)] px-1.5 py-0.5 text-[10px] font-medium", status.className)}>
                    {status.label}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right tabular text-ink-5">
                  {m.lastActiveAt ? new Date(m.lastActiveAt).toLocaleDateString() : "—"}
                </td>
                <td className="px-3 py-2.5 text-right tabular text-ink-5">
                  {new Date(m.createdAt).toLocaleDateString()}
                </td>
                {(capabilities.canManage || capabilities.canRemove) && (
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    {!cannotMutate && capabilities.canManage && m.status === "active" && (
                      <ActionBtn icon={Pause} label="Suspender" onClick={() => onSuspend(m.id)} disabled={busyId === m.id} />
                    )}
                    {!cannotMutate && capabilities.canManage && m.status === "suspended" && (
                      <ActionBtn icon={Play} label="Reactivar" onClick={() => onReactivate(m.id)} disabled={busyId === m.id} />
                    )}
                    {!cannotMutate && capabilities.canRemove && (
                      <ActionBtn icon={Trash2} label="Remover" onClick={() => onRemove(m.id)} disabled={busyId === m.id} tone="danger" />
                    )}
                    {cannotMutate && (
                      <span className="text-[11px] text-ink-6">{isOwner ? "Propietario" : isSelf ? "Vos" : ""}</span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function InvitationsTable({ rows, canManage, busyId, onResend, onRevoke }: { rows: InvitationRow[]; canManage: boolean; busyId: string | null; onResend: (id: string) => void; onRevoke: (id: string) => void }) {
  return (
    <div className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] overflow-hidden">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-[color:var(--hairline)] bg-[var(--surface-1)]">
            <th className="px-3 py-2.5 text-left font-medium text-ink-5">Email</th>
            <th className="px-3 py-2.5 text-left font-medium text-ink-5">Rol</th>
            <th className="px-3 py-2.5 text-right font-medium text-ink-5">Expira</th>
            {canManage && <th className="px-3 py-2.5 text-right font-medium text-ink-5">Acciones</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--hairline)]">
          {rows.map((inv) => (
            <tr key={inv.id} className="hover:bg-[var(--surface-1)]">
              <td className="px-3 py-2.5 text-ink-0">
                <Mail className="inline h-3 w-3 mr-1 text-ink-5" />
                {inv.email}
              </td>
              <td className="px-3 py-2.5 text-ink-3">{ROLE_LABEL[inv.role] ?? inv.role}</td>
              <td className="px-3 py-2.5 text-right tabular text-ink-5">
                <Clock className="inline h-3 w-3 mr-1" />
                {new Date(inv.expiresAt).toLocaleString()}
              </td>
              {canManage && (
                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                  <ActionBtn icon={RefreshCcw} label="Reenviar" onClick={() => onResend(inv.id)} disabled={busyId === inv.id} />
                  <ActionBtn icon={X} label="Revocar" onClick={() => onRevoke(inv.id)} disabled={busyId === inv.id} tone="danger" />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick, disabled, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void; disabled?: boolean; tone?: "danger" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "ml-1.5 inline-flex items-center gap-1 rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] px-2 py-1 text-[11px] font-medium hover:bg-[var(--surface-2)] disabled:opacity-50",
        tone === "danger" ? "text-[color:var(--signal-danger)]" : "text-ink-0",
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}

function RoleLegend() {
  return (
    <section className="rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] p-4">
      <h3 className="mb-3 flex items-center gap-2 text-[12px] font-semibold text-ink-3">
        <Eye className="h-3.5 w-3.5" /> Roles y permisos
      </h3>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-[12px] font-semibold text-ink-0">Propietario</dt>
          <dd className="mt-0.5 text-[11px] text-ink-5">Acceso completo. Inmutable.</dd>
        </div>
        {ROLE_OPTIONS.map((r) => (
          <div key={r.value}>
            <dt className="text-[12px] font-semibold text-ink-0">{r.label}</dt>
            <dd className="mt-0.5 text-[11px] text-ink-5">{r.desc}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function InviteModal({ onClose, onSubmit, isPending }: { onClose: () => void; onSubmit: (email: string, role: string) => Promise<void>; isPending: boolean }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("manager");

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-ink-0/40 backdrop-blur-[2px]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Invitar miembro"
        className="w-[440px] max-w-[92vw] rounded-[var(--r-lg)] border border-[color:var(--hairline)] bg-[var(--surface-0)] shadow-[var(--shadow-overlay)]"
        onClick={(e) => e.stopPropagation()}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try { await onSubmit(email.trim(), role); } catch { /* surfaced by parent */ }
          }}
          className="p-5"
        >
          <h2 className="text-[15px] font-semibold text-ink-0">Invitar miembro</h2>
          <p className="mt-1 text-[12px] text-ink-5">
            Recibirá un enlace válido por 72 horas. Solo puede usarse una vez.
          </p>
          <label className="mt-4 block text-[11px] font-medium text-ink-5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="colaborador@ejemplo.com"
            className="mt-1 block w-full rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-paper)] px-3 py-2 text-[13px] outline-none focus-visible:shadow-[var(--shadow-focus)]"
          />
          <label className="mt-3 block text-[11px] font-medium text-ink-5">Rol</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="mt-1 block w-full rounded-[var(--r-sm)] border border-[color:var(--hairline-strong)] bg-[var(--surface-paper)] px-3 py-2 text-[13px] text-ink-0 outline-none"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] px-4 py-2 text-[12px] font-medium text-ink-0 hover:bg-[var(--surface-2)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || email.length < 5}
              className="rounded-full bg-ink-0 px-4 py-2 text-[12px] font-medium text-ink-12 hover:bg-ink-2 disabled:opacity-50"
            >
              {isPending ? "Enviando..." : "Enviar invitación"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
