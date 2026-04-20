import { Plug } from "lucide-react";

import { getCurrentStore } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { SettingsCategoryPanel, type StatusFact } from "@/components/admin/settings/SettingsCategoryPanel";

// ─── Settings · Integraciones ───────────────────────────────────────────
//
// /admin/integrations already renders the full integrations hub (status,
// reconnect flows, health checks per provider). Here we report a
// lightweight count of active provider connections so the merchant sees
// real state from the settings center, then jump to the module for
// the full detail.

export const dynamic = "force-dynamic";

export default async function SettingsIntegracionesPage() {
  const store = await getCurrentStore();
  const storeId = store?.id ?? null;

  const [activeCount, totalCount] = storeId
    ? await Promise.all([
        prisma.providerConnection.count({
          where: { storeId, status: "active" },
        }),
        prisma.providerConnection.count({ where: { storeId } }),
      ])
    : [0, 0];

  const facts: StatusFact[] = [
    {
      label: "Conexiones activas",
      value: `${activeCount}`,
      tone: activeCount > 0 ? "ok" : "muted",
    },
    {
      label: "Conexiones registradas",
      value: `${totalCount}`,
    },
  ];

  return (
    <SettingsCategoryPanel
      eyebrow="Cuenta y plataforma"
      title="Integraciones"
      description="Proveedores externos conectados a tu tienda: sincronización de catálogo, tracking de envíos, APIs y webhooks. El hub de integraciones muestra el estado real de cada conexión con su último heartbeat."
      icon={Plug}
      facts={facts}
      actions={[
        { href: "/admin/integrations", label: "Abrir integraciones", variant: "primary" },
      ]}
    >
      <p>
        Cada integración se conecta con su propio flujo (OAuth, API key, webhook). Desde acá te
        mostramos el conteo real leído de la base de datos; el detalle por proveedor —con reconexión
        y diagnóstico— vive en el módulo de integraciones.
      </p>
    </SettingsCategoryPanel>
  );
}
