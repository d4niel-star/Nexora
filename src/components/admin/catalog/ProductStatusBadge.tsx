import { ProductStatus } from "../../../types/product";

export const ProductStatusBadge = ({ status }: { status: ProductStatus }) => {
  const tone: Record<ProductStatus, string> = {
    active: "text-[color:var(--signal-success)]",
    draft: "text-[color:var(--signal-warning)]",
    archived: "text-ink-5",
  };

  const labels: Record<ProductStatus, string> = {
    active: "Activo",
    draft: "Borrador",
    archived: "Archivado",
  };

  return (
    <span className={`inline-flex items-center h-6 rounded-[var(--r-xs)] border border-[color:var(--hairline)] bg-[var(--surface-1)] px-2 text-[10px] font-medium uppercase tracking-[0.14em] ${tone[status]}`}>
      {labels[status]}
    </span>
  );
};
