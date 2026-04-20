import { CreditCard } from "lucide-react";

import { SettingsCategoryPanel } from "@/components/admin/settings/SettingsCategoryPanel";

// ─── Settings · Finanzas y retiros ──────────────────────────────────────
//
// /admin/finances is the canonical surface for bank accounts, payout
// requests and historical withdrawals. Keeping a separate form here
// would duplicate the retirement flow and the attached approvals. We
// ship an honest status panel and a deep link into the real module.

export const dynamic = "force-dynamic";

export default async function SettingsFinanzasPage() {
  return (
    <SettingsCategoryPanel
      eyebrow="Cuenta y plataforma"
      title="Finanzas y retiros"
      description="Cargá la cuenta bancaria donde querés recibir los retiros y seguí el estado de cada solicitud. El módulo de finanzas verifica la cuenta contra el CBU/CVU real antes de habilitarla."
      icon={CreditCard}
      actions={[
        { href: "/admin/finances", label: "Abrir finanzas", variant: "primary" },
      ]}
    >
      <p>
        Por seguridad, Nexora nunca dispara un retiro automáticamente. Todas las salidas pasan por una
        solicitud explícita desde finanzas; acá sólo te damos un atajo al módulo.
      </p>
    </SettingsCategoryPanel>
  );
}
