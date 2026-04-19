import { OrderStatus, PaymentStatus } from "../../../types/order";

const baseChip = "inline-flex items-center h-6 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 text-[10px] font-medium uppercase tracking-[0.14em]";

export const OrderStatusBadge = ({ status }: { status: OrderStatus }) => {
  const tone: Record<OrderStatus, string> = {
    new: "text-ink-3",
    paid: "text-[color:var(--signal-success)]",
    processing: "text-[color:var(--signal-warning)]",
    shipped: "text-ink-3",
    delivered: "text-[color:var(--signal-success)]",
    cancelled: "text-[color:var(--signal-danger)]",
    refunded: "text-ink-5",
  };

  const labels: Record<OrderStatus, string> = {
    new: "Nuevo",
    paid: "Pagado",
    processing: "En Proceso",
    shipped: "Enviado",
    delivered: "Entregado",
    cancelled: "Cancelado",
    refunded: "Reembolsado",
  };

  return (
    <span className={`${baseChip} ${tone[status] || tone.new}`}>
      {labels[status] || status}
    </span>
  );
};

export const PaymentStatusBadge = ({ status }: { status: PaymentStatus }) => {
  const tone: Record<string, string> = {
    paid: "text-[color:var(--signal-success)]",
    approved: "text-[color:var(--signal-success)]",
    pending: "text-[color:var(--signal-warning)]",
    in_process: "text-ink-3",
    failed: "text-[color:var(--signal-danger)]",
    rejected: "text-[color:var(--signal-danger)]",
    cancelled: "text-ink-5",
    refunded: "text-ink-5",
  };

  const labels: Record<string, string> = {
    paid: "Pagado",
    approved: "Acreditado",
    pending: "Pendiente",
    in_process: "Procesando",
    failed: "Fallido",
    rejected: "Rechazado",
    cancelled: "Cancelado",
    refunded: "Reembolsado",
  };

  return (
    <span className={`${baseChip} ${tone[status] || tone.pending}`}>
      {labels[status] || status}
    </span>
  );
};
