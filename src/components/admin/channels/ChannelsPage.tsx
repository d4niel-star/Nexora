"use client";

import { useEffect, useState, useTransition } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Globe2,
  Link as LinkIcon,
  Loader2,
  RefreshCw,
  ShoppingBag,
  Store,
  XCircle,
  Unplug
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getChannelConnectionsAction,
  validateChannelConnectionAction,
  disconnectChannelAction
} from "@/lib/channels/oauth/actions";
import { useSearchParams } from "next/navigation";

// Definición local para evitar refetching inmenso al cambiar estado
type SafeConnectionInfo = {
  id: string;
  channel: string;
  status: string;
  externalAccountId: string | null;
  accountName: string | null;
  lastValidatedAt: Date | null;
  lastError: string | null;
  tokenExpiresAt: Date | null;
};

export function ChannelsPage() {
  const [connections, setConnections] = useState<SafeConnectionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const conns = await getChannelConnectionsAction();
      setConnections(conns);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleValidate = (id: string, channel: string) => {
    startTransition(async () => {
      await validateChannelConnectionAction(id, channel);
      await loadData();
    });
  };

  const handleDisconnect = (id: string, channel: string) => {
    if (!confirm(`¿Estás seguro de desconectar ${channel}? Esto detendrá las sincronizaciones.`)) return;
    startTransition(async () => {
      await disconnectChannelAction(id, channel);
      await loadData();
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#CCCCCC]" />
      </div>
    );
  }

  const mlConn = connections.find(c => c.channel === "mercadolibre");
  const shopifyConn = connections.find(c => c.channel === "shopify");

  const oauthError = searchParams.get("error");

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-[#111111] leading-none">Canales B2B & B2C</h1>
          <p className="mt-2 text-[13px] text-[#999999]">
            Conectá autenticación segura con Mercados y Plataformas de E-commerce.
          </p>
        </div>
      </div>

      {oauthError && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-[13px] font-bold text-red-800">
             Error de autorización: {oauthError === "missing_shop" ? "Dominio no provisto" : "Flujo cancelado o inválido."}
          </p>
        </div>
      )}

      {/* ─── Channels Grid ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Mercado Libre Card */}
        <ChannelCard
          title="Mercado Libre"
          description="Alcanzá millones de compradores en LATAM. Publicá automáticamente desde el espejo local."
          icon={<ShoppingBag className="h-8 w-8 text-[#FFE600] group-hover:drop-shadow-md transition-all" />}
          channelId="mercadolibre"
          connection={mlConn}
          onValidate={() => mlConn && handleValidate(mlConn.id, "mercadolibre")}
          onDisconnect={() => mlConn && handleDisconnect(mlConn.id, "mercadolibre")}
          isPending={isPending}
          connectUrl="/api/channels/oauth/mercadolibre/start"
        />

        {/* Shopify Card */}
        <ChannelCard
          title="Shopify"
          description="Sincronizá tu catálogo propio externo. Conectá tu storefront en Shopify al motor operativo."
          icon={<ShoppingBag className="h-8 w-8 text-[#95BF47] group-hover:drop-shadow-md transition-all" />}
          channelId="shopify"
          connection={shopifyConn}
          onValidate={() => shopifyConn && handleValidate(shopifyConn.id, "shopify")}
          onDisconnect={() => shopifyConn && handleDisconnect(shopifyConn.id, "shopify")}
          isPending={isPending}
          requiresShopDomain={true}
        />

      </div>
    </div>
  );
}


function ChannelCard({ title, description, icon, channelId, connection, onValidate, onDisconnect, isPending, connectUrl, requiresShopDomain }: any) {
  
  const [shopDomain, setShopDomain] = useState("");
  const isConnected = connection && connection.status === "connected";
  const isExpired = connection && (connection.status === "expired" || connection.status === "invalid");
  const isDisconnected = !connection || connection.status === "disconnected";

  const handleShopifyConnect = () => {
    if (!shopDomain) return alert("Ingresá tu dominio de Shopify (ej: mitienda.myshopify.com)");
    const cleanDomain = shopDomain.replace("https://", "").replace("http://", "").split("/")[0];
    window.location.href = `/api/channels/oauth/shopify/start?shop=${encodeURIComponent(cleanDomain)}`;
  };

  return (
    <div className="group flex flex-col justify-between rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-sm transition-all hover:border-[#CCCCCC] hover:shadow-md relative overflow-hidden">
      
      {/* Top Section */}
      <div>
        <div className="flex items-start justify-between">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#FAFAFA] border border-[#F0F0F0]">
            {icon}
          </div>
          <ConnectionBadge status={isDisconnected ? "disconnected" : connection.status} />
        </div>

        <h3 className="mt-5 text-[18px] font-extrabold text-[#111111]">{title}</h3>
        <p className="mt-1.5 text-[13px] text-[#777777] leading-relaxed">{description}</p>
        
        {!isDisconnected && (
          <div className="mt-6 rounded-lg border border-[#F0F0F0] bg-[#FAFAFA] p-4 text-[12px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#888888] font-medium">Cuenta Vinculada</span>
              <span className="font-bold text-[#111111]">{connection.accountName || connection.externalAccountId}</span>
            </div>
            {connection.tokenExpiresAt && (
              <div className="flex items-center justify-between border-t border-[#F0F0F0] pt-2">
                <span className="text-[#888888] font-medium">Vencimiento Token</span>
                <span className={cn("font-bold", new Date(connection.tokenExpiresAt) < new Date() ? "text-red-500" : "text-emerald-600")}>
                  {new Date(connection.tokenExpiresAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="mt-8 pt-5 border-t border-[#F5F5F5] flex flex-col gap-3">
        {isDisconnected ? (
          requiresShopDomain ? (
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="ej: mitienda.myshopify.com" 
                value={shopDomain}
                onChange={e => setShopDomain(e.target.value)}
                className="flex-1 rounded-md border border-[#E5E5E5] px-3 py-2 text-[12px] text-[#111111] focus:border-[#111111] focus:outline-none"
              />
              <button
                onClick={handleShopifyConnect}
                disabled={isPending}
                className="flex items-center justify-center gap-1.5 rounded-md bg-[#111111] px-4 py-2 text-[12px] font-bold text-white transition-colors hover:bg-black disabled:opacity-50"
              >
                Conectar
              </button>
            </div>
          ) : (
            <a 
              href={connectUrl}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-[#111111] py-2 text-[12px] font-bold text-white transition-colors hover:bg-black disabled:opacity-50"
            >
              <LinkIcon className="h-3.5 w-3.5" />
              Conectar Cuenta OAuth
            </a>
          )
        ) : (
          <div className="flex gap-2">
            {isExpired ? (
              <a 
                href={requiresShopDomain ? `/api/channels/oauth/shopify/start?shop=${encodeURIComponent(connection.externalAccountId)}` : connectUrl}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-[#111111] py-2 text-[12px] font-bold text-white hover:bg-black transition-colors min-w-[120px]"
              >
                Renovar Auth
              </a>
            ) : (
              <button 
                 onClick={onValidate}
                 disabled={isPending}
                 className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-[#FAFAFA] border border-[#E5E5E5] py-2 text-[12px] font-bold text-[#111111] hover:bg-[#F5F5F5] transition-colors"
                 title="Verificar validez actual contra la API"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Validate
              </button>
            )}
            <button 
                 onClick={onDisconnect}
                 disabled={isPending}
                 className="flex items-center justify-center gap-1.5 rounded-md border border-red-200 bg-red-50 py-2 px-4 text-[12px] font-bold text-red-600 hover:bg-red-100 hover:border-red-300 transition-colors"
                 title="Eliminar credencial OAuth y desconectar de Nexora"
              >
                <Unplug className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ConnectionBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    connected: "bg-emerald-100 text-emerald-700 border-emerald-200",
    connecting: "bg-blue-100 text-blue-700 border-blue-200",
    disconnected: "bg-[#F5F5F5] text-[#888888] border-[#E5E5E5]",
    expired: "bg-orange-100 text-orange-700 border-orange-200",
    invalid: "bg-red-100 text-red-700 border-red-200",
    error: "bg-red-100 text-red-700 border-red-200",
  };

  const labels: Record<string, string> = {
    connected: "Conectado Seguro",
    disconnected: "No Conectado",
    expired: "Token Expirado",
    invalid: "Auth Inválida",
  };

  return (
    <span className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest", styles[status] || styles.disconnected)}>
       {status === "connected" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
       {labels[status] || status}
    </span>
  );
}
