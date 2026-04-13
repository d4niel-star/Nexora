import { ProductStatus } from "../../../types/product";

export const ProductStatusBadge = ({ status }: { status: ProductStatus }) => {
  const styles: Record<ProductStatus, string> = {
    active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    draft: "bg-yellow-50 text-yellow-800 ring-yellow-600/20",
    archived: "bg-gray-100 text-gray-600 ring-gray-500/20",
  };

  const labels: Record<ProductStatus, string> = {
    active: "Activo",
    draft: "Borrador",
    archived: "Archivado",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-bold uppercase tracking-wider ring-1 ring-inset ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};
