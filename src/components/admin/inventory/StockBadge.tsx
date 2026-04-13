import { StockStatus, SyncStatus } from "../../../types/inventory";
import { CloudOff, CloudSnow, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";

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

export const SyncStatusIcon = ({ status }: { status: SyncStatus }) => {
  switch (status) {
    case 'synced':
      return <div className="flex bg-gray-50 border border-[#EAEAEA] px-2 py-1 rounded-md items-center gap-1 text-[11px] font-bold text-gray-500"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Sincronizado</div>;
    case 'syncing':
      return <div className="flex bg-blue-50 border border-blue-100 px-2 py-1 rounded-md items-center gap-1 text-[11px] font-bold text-blue-600"><RefreshCw className="w-3 h-3 animate-spin" /> Sincronizando</div>;
    case 'error':
      return <div className="flex bg-red-50 border border-red-100 px-2 py-1 rounded-md items-center gap-1 text-[11px] font-bold text-red-600"><AlertTriangle className="w-3 h-3" /> Error API</div>;
    case 'unlinked':
      return <div className="flex bg-gray-50 border border-[#EAEAEA] px-2 py-1 rounded-md items-center gap-1 text-[11px] font-bold text-gray-400"><CloudOff className="w-3 h-3" /> Manual</div>;
  }
};
