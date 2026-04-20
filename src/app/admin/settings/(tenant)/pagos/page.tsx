import { Wallet } from "lucide-react";

import { getCurrentStore } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getMercadoPagoPlatformReadiness } from "@/lib/payments/mercadopago/platform-readiness";
import { SettingsCategoryPanel, type StatusFact } from "@/components/admin/settings/SettingsCategoryPanel";

// ─── Settings · Medios de pago ──────────────────────────────────────────
//
// Real configuration surface for the tenant's Mercado Pago OAuth
// connection. The connect/disconnect flow and token lifecycle already
// live at /api/payments/mercadopago/oauth/*, so this page reports real
// DB state and surfaces the exact server route merchants need to hit.
// No simulated statuses: every chip is sourced from a prisma row.

export const dynamic = "force-dynamic";

export default async function SettingsPagosPage() {
  const store = await getCurrentStore();
  const platformReadiness = getMercadoPagoPlatformReadiness();

  const connection = store
    ? await prisma.storePaymentProvider.findUnique({
        where: { storeId_provider: { storeId: store.id, provider: "mercadopago" } },
        select: {
          status: true,
          externalAccountId: true,
          updatedAt: true,
          createdAt: true,
        },
      })
    : null;

  const connected = connection?.status === "connected" && !!connection.externalAccountId;

  const facts: StatusFact[] = [
    {
      label: "Proveedor",
      value: "Mercado Pago",
    },
    {
      label: "Estado",
      value: connected
        ? "Conectado — checkout habilitado"
        : connection
        ? "Revocado o incompleto"
        : "Sin conectar",
      tone: connected ? "ok" : "warn",
    },
    {
      label: "Cuenta",
      value: connection?.externalAccountId ? `ID ${connection.externalAccountId}` : "—",
    },
    {
      label: "Última actualización",
      value: connection?.updatedAt
        ? new Date(connection.updatedAt).toLocaleString("es-AR")
        : "—",
    },
  ];

  // Platform-level readiness: if MP env vars are missing, the connect
  // CTA has no chance of working. Surface the honest reason instead of
  // rendering a dead button.
  const canConnect = platformReadiness.ready;

  return (
    <SettingsCategoryPanel
      eyebrow="Pagos y checkout"
      title="Medios de pago"
      description="Conectá tu cuenta de Mercado Pago para que tu tienda pueda cobrar. El token se guarda cifrado por tienda y Nexora sólo lo usa para crear preferencias de checkout."
      icon={Wallet}
      facts={facts}
      actions={
        canConnect
          ? connected
            ? [
                {
                  href: "/admin/store?tab=pagos",
                  label: "Administrar Mercado Pago",
                  variant: "secondary",
                },
              ]
            : [
                {
                  href: "/api/payments/mercadopago/oauth/start",
                  label: "Conectar Mercado Pago",
                  variant: "primary",
                },
                {
                  href: "/admin/store?tab=pagos",
                  label: "Ver detalle en Mi tienda",
                  variant: "secondary",
                },
              ]
          : [
              {
                href: "/admin/store?tab=pagos",
                label: "Ver detalle en Mi tienda",
                variant: "secondary",
              },
            ]
      }
    >
      {canConnect ? (
        connected ? (
          <p>
            El checkout público está activo. Mercado Pago maneja la carga de la tarjeta y Nexora recibe la
            confirmación por webhook. Podés administrar la conexión desde la pestaña <strong>Pagos</strong> de
            Mi tienda, que expone el flujo completo (desconexión, reintentos, estado del token).
          </p>
        ) : (
          <p>
            Tu tienda todavía no puede cobrar. Al conectar, Nexora te redirige al Developer Dashboard de
            Mercado Pago y persiste el <em>access token</em> cifrado por tienda — nunca se loguea ni se
            muestra en UI.
          </p>
        )
      ) : (
        <p>
          La plataforma todavía no tiene cargadas todas las variables de entorno de Mercado Pago, así que el
          botón de conexión está deshabilitado para evitar errores silenciosos. Avisá al equipo de Nexora
          para completar la configuración global.
        </p>
      )}
    </SettingsCategoryPanel>
  );
}
