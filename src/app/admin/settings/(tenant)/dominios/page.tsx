import { Globe } from "lucide-react";

import { getCurrentStore } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { SettingsCategoryPanel, type StatusFact } from "@/components/admin/settings/SettingsCategoryPanel";

// ─── Settings · Dominios ────────────────────────────────────────────────
//
// The full custom-domain configuration UI (add domain, verify DNS, set
// primary, remove) lives inside the StorePage's "Dominio" tab at
// /admin/store?tab=dominio. That component (DomainSettingsView) is a
// client component that receives StorePage's initial data — rendering
// it outside of StorePage would require re-fetching and duplicating
// that shape.
//
// To avoid drift, this settings page shows the honest current state
// (subdomain + custom domains from the DB) and deep-links to the
// existing management surface. Zero invention: both facts come from
// real prisma rows.

export const dynamic = "force-dynamic";

export default async function SettingsDominiosPage() {
  const store = await getCurrentStore();

  const domains = store
    ? await prisma.storeDomain.findMany({
        where: { storeId: store.id },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        select: {
          hostname: true,
          isPrimary: true,
          status: true,
        },
      })
    : [];

  const primary = domains.find((d) => d.isPrimary);
  // Per prisma schema, StoreDomain.status is one of "active" | "pending" | "failed".
  const verifiedCount = domains.filter((d) => d.status === "active").length;

  const facts: StatusFact[] = [
    {
      label: "Subdominio Nexora",
      value: store?.subdomain ? `${store.subdomain}.nexora.app` : "No configurado",
      tone: store?.subdomain ? "muted" : "warn",
    },
    {
      label: "Dominio principal",
      value: primary ? primary.hostname : "Subdominio por defecto",
      tone: primary ? "ok" : "muted",
    },
    {
      label: "Dominios propios",
      value: domains.length === 0
        ? "Ninguno cargado"
        : `${verifiedCount}/${domains.length} verificados`,
      tone: domains.length === 0 ? "muted" : verifiedCount === domains.length ? "ok" : "warn",
    },
  ];

  return (
    <SettingsCategoryPanel
      eyebrow="Tienda y dominios"
      title="Dominios"
      description="Cada tienda Nexora vive en un subdominio propio y puede conectar hasta un dominio personalizado. La verificación DNS y el marcado de dominio primario se administran desde Mi tienda para compartir la misma sesión de datos."
      icon={Globe}
      facts={facts}
      actions={[
        {
          href: "/admin/store?tab=dominio",
          label: "Administrar dominios",
          variant: "primary",
        },
      ]}
    >
      <p>
        Cargá un dominio personalizado (<em>tu-marca.com</em>) y apuntá los registros DNS según las
        instrucciones que Nexora genera al crearlo. Una vez verificado, podés marcarlo como principal y
        el storefront redirige el subdominio hacia él sin romper URLs existentes.
      </p>
    </SettingsCategoryPanel>
  );
}
