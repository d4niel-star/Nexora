"use client";

import { useEffect, useRef, useState } from "react";
import {
  BellDot,
  Clipboard,
  Copy,
  Crown,
  MessageSquarePlus,
  Phone,
  StickyNote,
  UserRound,
  X,
} from "lucide-react";

import type { Customer } from "@/types/customer";
import { formatCurrency } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/admin/orders/StatusBadge";
import {
  CustomerBadge,
  CustomerChannelBadge,
} from "@/components/admin/customers/CustomerBadge";

interface CustomerDrawerProps {
  customer: Customer | null;
  isOpen: boolean;
  focusSection: "history" | "notes" | null;
  onClose: () => void;
  onAddNote: (customerId: string, note: string) => void;
  onAddTag: (customerId: string, tag: string) => void;
  onCopyEmail: (customer: Customer) => void;
  onMarkVip: (customer: Customer) => void;
  onMarkFollowUp: (customerId: string) => void;
}

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const quickTags = ["Seguimiento", "Alto valor", "Reactivar"];

export function CustomerDrawer({
  customer,
  isOpen,
  focusSection,
  onClose,
  onAddNote,
  onAddTag,
  onCopyEmail,
  onMarkVip,
  onMarkFollowUp,
}: CustomerDrawerProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "unset";
      return;
    }

    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !customer) {
    return null;
  }

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-40 bg-[#111111]/28 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <DrawerPanel
        key={`${customer.id}-${focusSection ?? "overview"}`}
        customer={customer}
        focusSection={focusSection}
        onAddNote={onAddNote}
        onAddTag={onAddTag}
        onCopyEmail={onCopyEmail}
        onMarkVip={onMarkVip}
        onMarkFollowUp={onMarkFollowUp}
        onClose={onClose}
        panelRef={panelRef}
      />
    </>
  );
}

function DrawerPanel({
  customer,
  focusSection,
  onAddNote,
  onAddTag,
  onCopyEmail,
  onMarkVip,
  onMarkFollowUp,
  onClose,
  panelRef,
}: {
  customer: Customer;
  focusSection: "history" | "notes" | null;
  onAddNote: (customerId: string, note: string) => void;
  onAddTag: (customerId: string, tag: string) => void;
  onCopyEmail: (customer: Customer) => void;
  onMarkVip: (customer: Customer) => void;
  onMarkFollowUp: (customerId: string) => void;
  onClose: () => void;
  panelRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [noteDraft, setNoteDraft] = useState("");
  const notesRef = useRef<HTMLDivElement | null>(null);
  const historyRef = useRef<HTMLDivElement | null>(null);
  const noteTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!focusSection) {
      return;
    }

    const target = focusSection === "notes" ? notesRef.current : historyRef.current;
    if (!target) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      if (focusSection === "notes") {
        noteTextareaRef.current?.focus();
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [focusSection]);

  const submitNote = () => {
    const trimmedNote = noteDraft.trim();
    if (!trimmedNote) {
      return;
    }

    onAddNote(customer.id, trimmedNote);
    setNoteDraft("");
  };

  return (
    <div
      ref={panelRef}
      aria-labelledby="customer-drawer-title"
      aria-modal="true"
      className="fixed inset-y-0 right-0 z-50 flex w-full flex-col overflow-y-auto border-l border-[#EAEAEA] bg-white shadow-2xl outline-none animate-in slide-in-from-right-5 duration-300 sm:max-w-xl"
      role="dialog"
      tabIndex={-1}
    >
      <div className="sticky top-0 z-20 border-b border-[#EAEAEA] bg-white/90 px-6 py-5 backdrop-blur-xl sm:px-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-sm font-black uppercase tracking-[0.22em] text-[#111111]">
                {getInitials(customer.name)}
              </div>
              <div className="min-w-0">
                <h2
                  id="customer-drawer-title"
                  className="truncate text-xl font-extrabold tracking-tight text-[#111111]"
                >
                  {customer.name}
                </h2>
                <p className="truncate text-sm font-medium text-gray-500">
                  {customer.email}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <CustomerBadge tone={customer.segment} />
              <CustomerBadge
                tone={
                  customer.lifecycleStatus === "active"
                    ? "active"
                    : customer.lifecycleStatus
                }
              />
              {customer.isHighValue ? <CustomerBadge tone="high_value" /> : null}
            </div>
          </div>

          <button
            aria-label="Cerrar drawer de cliente"
            className="rounded-full p-2.5 text-gray-400 transition-all hover:bg-gray-100 hover:text-[#111111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-8 p-6 sm:p-8">
        <section className="grid grid-cols-2 gap-0 overflow-hidden rounded-2xl border border-[#EAEAEA] shadow-sm">
          <MetricCard label="Total gastado" value={formatCurrency(customer.totalSpent)} />
          <MetricCard
            label="Ticket promedio"
            value={formatCurrency(customer.averageTicket)}
            muted
          />
          <MetricCard label="Pedidos" value={customer.ordersCount.toString()} muted />
          <MetricCard label="Canal" value={customer.channel} />
        </section>

        <section className="rounded-2xl border border-[#EAEAEA] bg-[#FAFAFA]/50 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">
              Acciones rapidas
            </h3>
            <CustomerChannelBadge channel={customer.channel} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ActionButton
              icon={<Copy className="h-4 w-4" />}
              label="Copiar email"
              onClick={() => onCopyEmail(customer)}
            />
            <ActionButton
              icon={<Crown className="h-4 w-4" />}
              label={customer.segment === "vip" ? "Cliente VIP" : "Marcar VIP"}
              onClick={() => onMarkVip(customer)}
            />
            <ActionButton
              icon={<StickyNote className="h-4 w-4" />}
              label="Agregar nota"
              onClick={() => noteTextareaRef.current?.focus()}
            />
            <ActionButton
              icon={<BellDot className="h-4 w-4" />}
              label="Seguimiento"
              onClick={() => onMarkFollowUp(customer.id)}
            />
            <ActionButton
              icon={<Clipboard className="h-4 w-4" />}
              label="Ver historial"
              onClick={() =>
                historyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <InfoBlock icon={<UserRound className="h-4 w-4" />} label="Contacto">
            <InfoRow label="Email" value={customer.email} />
            <InfoRow
              label="Telefono"
              value={customer.phone ?? "Sin telefono registrado"}
            />
            <InfoRow
              label="Canal origen"
              value={<CustomerChannelBadge channel={customer.channel} />}
            />
          </InfoBlock>

          <InfoBlock icon={<Phone className="h-4 w-4" />} label="Relacion">
            <InfoRow
              label="Primera compra"
              value={dateFormatter.format(new Date(customer.firstPurchaseAt))}
            />
            <InfoRow
              label="Ultima compra"
              value={dateFormatter.format(new Date(customer.lastPurchaseAt))}
            />
            <InfoRow
              label="Estado"
              value={
                customer.lifecycleStatus === "active"
                  ? "Activo"
                  : customer.lifecycleStatus === "inactive"
                    ? "Inactivo"
                    : "Riesgo"
              }
            />
          </InfoBlock>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-2">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">
              Etiquetas
            </h3>
            <span className="text-xs font-semibold text-gray-400">
              Mock editable
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {customer.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600"
              >
                {tag}
              </span>
            ))}

            {quickTags
              .filter((tag) => !customer.tags.includes(tag))
              .map((tag) => (
                <button
                  key={tag}
                  className="inline-flex items-center rounded-full border border-[#EAEAEA] bg-white px-3 py-1 text-xs font-semibold text-[#111111] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
                  onClick={() => onAddTag(customer.id, tag)}
                  type="button"
                >
                  + {tag}
                </button>
              ))}
          </div>
        </section>

        <section className="space-y-4" ref={historyRef}>
          <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-2">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">
              Historial breve de pedidos
            </h3>
            <span className="text-xs font-semibold text-gray-400">
              {customer.orderHistory.length} pedidos
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#EAEAEA] bg-white shadow-sm">
            <div className="divide-y divide-[#EAEAEA]">
              {customer.orderHistory.map((order) => (
                <div
                  key={order.id}
                  className="flex items-start justify-between gap-4 px-5 py-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-[#111111]">{order.number}</p>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <p className="mt-1 text-xs font-medium text-gray-500">
                      {dateTimeFormatter.format(new Date(order.date))} / {order.itemsCount} items
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-black tracking-tight text-[#111111]">
                      {formatCurrency(order.total)}
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-gray-500">
                      {order.channel}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4" ref={notesRef}>
          <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-2">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">
              Notas internas
            </h3>
            <MessageSquarePlus className="h-4 w-4 text-gray-400" />
          </div>

          <div className="space-y-3">
            {customer.notes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#EAEAEA] bg-[#FAFAFA]/60 px-4 py-5 text-sm font-medium text-gray-500">
                Todavia no hay notas internas para este cliente.
              </div>
            ) : (
              customer.notes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-2xl border border-[#EAEAEA] bg-white px-4 py-4 shadow-sm"
                >
                  <p className="text-sm font-medium leading-relaxed text-[#111111]">
                    {note.body}
                  </p>
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                    {note.author} / {dateTimeFormatter.format(new Date(note.createdAt))}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="rounded-2xl border border-[#EAEAEA] bg-[#FAFAFA]/50 p-4">
            <label
              className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500"
              htmlFor="customer-note"
            >
              Agregar nota mock
            </label>
            <textarea
              ref={noteTextareaRef}
              className="min-h-[108px] w-full rounded-xl border border-transparent bg-white px-4 py-3 text-sm text-[#111111] transition-all placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              id="customer-note"
              onChange={(event) => setNoteDraft(event.target.value)}
              placeholder="Escribe una nota interna para ventas, CX u operaciones..."
              rows={4}
              value={noteDraft}
            />
            <div className="mt-3 flex justify-end">
              <button
                className="rounded-xl bg-[#111111] px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!noteDraft.trim()}
                onClick={submitNote}
                type="button"
              >
                Guardar nota
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className={`p-5 ${muted ? "bg-[#FAFAFA]" : "bg-white"}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
        {label}
      </p>
      <p className="mt-2 text-xl font-black tracking-tight text-[#111111]">{value}</p>
    </div>
  );
}

function InfoBlock({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h3 className="flex items-center gap-2 border-b border-[#EAEAEA] pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#888888]">
        {icon}
        {label}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
        {label}
      </p>
      <div className="text-sm font-medium text-[#111111]">{value}</div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex items-center gap-2 rounded-xl border border-[#EAEAEA] bg-white px-3 py-3 text-left text-sm font-semibold text-[#111111] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
      onClick={onClick}
      type="button"
    >
      <span className="text-gray-500">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0])
    .join("");
}
