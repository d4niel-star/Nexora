"use client";

import { useEffect, useState, useTransition } from "react";
import {
  DownloadCloud,
  CheckCircle2,
  Box,
  ExternalLink,
  PackageSearch,
  ShoppingCart,
  Network
} from "lucide-react";
import { cn } from "@/lib/utils";
import { checkChannelOrdersAction, getOperationsDataAction } from "@/lib/channels/orders/actions";

export function OperationsPage() {
  const [data, setData] = useState({ externalOrders: [], supplierOrders: [] } as any);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState("incoming");

  const loadData = async () => {
    setIsLoading(true);
    try {
       const res = await getOperationsDataAction();
       setData(res);
    } catch(e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleSimulateSale = () => {
     startTransition(async () => {
         try {
             await checkChannelOrdersAction();
             await loadData();
         } catch(e: any) {
             alert(e.message);
         }
     });
  };

  return (
     <div className="animate-in fade-in duration-500 space-y-8">
      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-[#111111] leading-none">Operaciones B2B</h1>
          <p className="mt-2 text-[13px] text-[#999999]">
            Ingesta de pedidos multicanal, dropshipping y ruteo a proveedores.
          </p>
        </div>
        <div className="flex gap-2">
           <button
             onClick={handleSimulateSale}
             disabled={isPending}
             className="flex items-center gap-1.5 rounded-md bg-[#111111] px-4 py-2 text-[12px] font-bold text-white transition-colors hover:bg-black disabled:opacity-50"
           >
             <DownloadCloud className={cn("h-4 w-4", isPending && "animate-pulse")} />
             Simular Compra Externa
           </button>
        </div>
      </div>

       <div className="flex items-center gap-6 border-b border-[#E5E5E5] px-1">
        <button
          className={cn("pb-3 text-[13px] font-bold uppercase tracking-wider flex border-b-2 items-center gap-1.5", activeTab === "incoming" ? "border-[#111111] text-[#111111]" : "border-transparent text-[#999999] hover:text-[#555555]")}
          onClick={() => setActiveTab("incoming")}
        >
          <ShoppingCart className="h-4 w-4" /> Ventas de Canales
        </button>
        <button
           className={cn("pb-3 text-[13px] font-bold uppercase tracking-wider flex border-b-2 items-center gap-1.5", activeTab === "routing" ? "border-[#111111] text-[#111111]" : "border-transparent text-[#999999] hover:text-[#555555]")}
           onClick={() => setActiveTab("routing")}
        >
          <Network className="h-4 w-4" /> Supplier Routing (Dropship)
        </button>
       </div>

       {activeTab === "incoming" && (
           <ExternalOrdersTable orders={data.externalOrders} />
       )}

       {activeTab === "routing" && (
           <SupplierOrdersTable orders={data.supplierOrders} />
       )}

     </div>
  );
}

function ExternalOrdersTable({ orders }: { orders: any[] }) {
   if (!orders || orders.length === 0) return <div className="p-10 border border-dashed rounded-xl text-center text-[#999999] text-[13px]">No hay pedidos importados.</div>;

   const getMapStatus = (s: string) => {
      if (s === "mapped") return "bg-emerald-100 text-emerald-700 border-emerald-200";
      if (s === "failed") return "bg-red-100 text-red-700 border-red-200";
      return "bg-[#F5F5F5] text-[#888888] border-[#E5E5E5]";
   };

   return (
      <div className="rounded-xl border border-[#E5E5E5] bg-white overflow-hidden shadow-sm">
         <table className="w-full text-left text-[13px]">
            <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-[11px] font-bold uppercase tracking-wider text-[#888888]">
               <tr>
                  <th className="px-6 py-3">Referencia EXT</th>
                  <th className="px-6 py-3">Canal</th>
                  <th className="px-6 py-3">Cliente</th>
                  <th className="px-6 py-3 text-right">Total</th>
                  <th className="px-6 py-3 text-center">Status Mapeo</th>
                  <th className="px-6 py-3 text-center">Ruteo Dropship</th>
                  <th className="px-6 py-3 text-right">Interna</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
               {orders.map(o => (
                  <tr key={o.id} className="hover:bg-[#FAFAFA] transition-colors">
                     <td className="px-6 py-3 font-semibold text-[#111111]">{o.externalOrderNumber || o.externalOrderId}</td>
                     <td className="px-6 py-3 uppercase tracking-wider text-[10px] font-bold text-[#888888]">{o.channel}</td>
                     <td className="px-6 py-3 text-[#555555]">
                        <div className="font-medium text-[#111111]">{o.customerName}</div>
                     </td>
                     <td className="px-6 py-3 text-right font-medium">${o.total.toLocaleString("es-AR")} {o.currency}</td>
                     <td className="px-6 py-3 text-center">
                         <span className={cn("inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", getMapStatus(o.status))}>
                            {o.status}
                         </span>
                     </td>
                     <td className="px-6 py-3 text-center">
                         {o.routingStatus === "routed" ? (
                             <span className="text-emerald-600 text-[11px] font-bold inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3"/> Enviado al Proveedor</span>
                         ) : o.routingStatus === "no_dropship_needed" ? (
                             <span className="text-[#888888] text-[11px]">Stock Propio</span>
                         ) : (
                             <span className="text-amber-600 text-[11px] font-bold">Pendiente...</span>
                         )}
                     </td>
                     <td className="px-6 py-3 text-right">
                         {o.mappedOrder ? (
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold text-[#111111] border border-slate-200">
                               {o.mappedOrder.orderNumber}
                            </span>
                         ) : "-"}
                     </td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
   );
}

function SupplierOrdersTable({ orders }: { orders: any[] }) {
   if (!orders || orders.length === 0) return <div className="p-10 border border-dashed rounded-xl text-center text-[#999999] text-[13px]">No hay órdenes de proveedor activas.</div>;

   return (
      <div className="rounded-xl border border-[#E5E5E5] bg-white overflow-hidden shadow-sm">
         <table className="w-full text-left text-[13px]">
            <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-[11px] font-bold uppercase tracking-wider text-[#888888]">
               <tr>
                  <th className="px-6 py-3">ID Ruteo</th>
                  <th className="px-6 py-3">Proveedor Destino</th>
                  <th className="px-6 py-3">Venta Origen</th>
                  <th className="px-6 py-3 text-right">Costo a Pagar</th>
                  <th className="px-6 py-3 text-center">Estado Fulfillment</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
               {orders.map(o => (
                  <tr key={o.id} className="hover:bg-[#FAFAFA] transition-colors">
                     <td className="px-6 py-3 font-mono text-[11px] text-[#555555]">
                        {o.id.split("-")[0].toUpperCase()}
                     </td>
                     <td className="px-6 py-3 font-bold text-[#111111]">
                        {o.providerConnection?.provider?.name || "Desconocido"}
                     </td>
                     <td className="px-6 py-3 text-[#555555]">
                         {o.internalOrder ? (
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold text-[#111111] border border-slate-200">
                               {o.internalOrder.orderNumber}
                            </span>
                         ) : "-"}
                     </td>
                     <td className="px-6 py-3 text-right font-medium text-red-600">
                        -${o.totalCost.toLocaleString("es-AR")} {o.currency}
                     </td>
                     <td className="px-6 py-3 text-center">
                         <span className="bg-blue-100 text-blue-700 border-blue-200 inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                            {o.status.replace(/_/g, " ")}
                         </span>
                     </td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
   );
}
