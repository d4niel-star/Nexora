type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export const StockStatusBadge = ({ status }: { status: StockStatus }) => {
  const tone: Record<StockStatus, string> = {
    in_stock: "text-[color:var(--signal-success)]",
    low_stock: "text-[color:var(--signal-warning)]",
    out_of_stock: "text-[color:var(--signal-danger)]",
  };

  const labels: Record<StockStatus, string> = {
    in_stock: "En stock",
    low_stock: "Stock bajo",
    out_of_stock: "Agotado",
  };

  return (
    <span className={`inline-flex items-center h-6 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 text-[10px] font-medium uppercase tracking-[0.14em] ${tone[status]}`}>
      {labels[status]}
    </span>
  );
};
