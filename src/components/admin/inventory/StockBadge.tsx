type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export const StockStatusBadge = ({ status }: { status: StockStatus }) => {
  const styles: Record<StockStatus, string> = {
    in_stock: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    low_stock: "bg-yellow-50 text-yellow-800 ring-yellow-600/20",
    out_of_stock: "bg-red-50 text-red-700 ring-red-600/10",
  };

  const labels: Record<StockStatus, string> = {
    in_stock: "En Stock",
    low_stock: "Stock Bajo",
    out_of_stock: "Agotado",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};
