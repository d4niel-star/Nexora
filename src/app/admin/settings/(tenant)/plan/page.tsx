import { Crown } from "lucide-react";

import { SettingsCategoryPanel } from "@/components/admin/settings/SettingsCategoryPanel";

// ─── Settings · Plan y facturación ──────────────────────────────────────
//
// The full billing surface (plan picker, credit consumption, invoices)
// lives at /admin/billing. Replicating that page here would create two
// sources of truth for plan state. Instead, we render a sober status
// panel and deep-link to the real billing module.

export const dynamic = "force-dynamic";

export default async function SettingsPlanPage() {
  return (
    <SettingsCategoryPanel
      eyebrow="Cuenta y plataforma"
      title="Plan y facturación"
      description="Administrá la suscripción de Nexora, los créditos de IA y los recibos de pago. El detalle operativo vive en el módulo de facturación, que calcula tu consumo real contra los límites del plan vigente."
      icon={Crown}
      actions={[
        { href: "/admin/billing", label: "Abrir plan y facturación", variant: "primary" },
        {
          href: "/admin/billing/observability",
          label: "Ver observabilidad del plan",
          variant: "secondary",
        },
      ]}
    >
      <p>
        El plan y los créditos se contabilizan por tienda. Si necesitás escalar o comprar más créditos de IA,
        hacelo desde el módulo principal — desde acá sólo te dejamos saltar a la pantalla correcta.
      </p>
    </SettingsCategoryPanel>
  );
}
