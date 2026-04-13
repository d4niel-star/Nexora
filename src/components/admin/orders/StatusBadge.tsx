import { OrderStatus, PaymentStatus } from "../../../types/order";

export const OrderStatusBadge = ({ status }: { status: OrderStatus }) => {
  const styles: Record<OrderStatus, string> = {
    new: "bg-blue-50 text-blue-700 ring-blue-600/20",
    paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    processing: "bg-yellow-50 text-yellow-800 ring-yellow-600/20",
    shipped: "bg-purple-50 text-purple-700 ring-purple-600/20",
    delivered: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    cancelled: "bg-red-50 text-red-700 ring-red-600/10",
    refunded: "bg-gray-100 text-gray-700 ring-gray-600/20",
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
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ring-1 ring-inset ${styles[status] || styles.new}`}>
      {labels[status] || status}
    </span>
  );
};

export const PaymentStatusBadge = ({ status }: { status: PaymentStatus }) => {
  const styles: Record<string, string> = {
    paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    pending: "bg-yellow-50 text-yellow-800 ring-yellow-600/20",
    in_process: "bg-blue-50 text-blue-700 ring-blue-600/20",
    failed: "bg-red-50 text-red-700 ring-red-600/10",
    rejected: "bg-red-50 text-red-700 ring-red-600/10",
    cancelled: "bg-gray-100 text-gray-600 ring-gray-600/20",
    refunded: "bg-gray-100 text-gray-700 ring-gray-600/20",
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
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-bold uppercase tracking-wider ring-1 ring-inset ${styles[status] || styles.pending}`}>
      {labels[status] || status}
    </span>
  );
};
