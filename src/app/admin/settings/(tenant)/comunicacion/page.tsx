import { MessageSquare } from "lucide-react";

import { getCurrentStore } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getPublicWhatsappSettings } from "@/lib/apps/whatsapp-recovery/settings";
import { SettingsCategoryPanel, type StatusFact } from "@/components/admin/settings/SettingsCategoryPanel";

// ─── Settings · Comunicación ────────────────────────────────────────────
//
// Status summary for everything that talks to the customer at the
// protocol level: WhatsApp recovery, post-purchase flows (review
// request, reorder reminder). Each of those has its own dedicated
// management surface inside /admin/apps/<slug>; we don't duplicate
// the setup forms here — we report the installed/active state and
// deep-link to each.

export const dynamic = "force-dynamic";

export default async function SettingsComunicacionPage() {
  const store = await getCurrentStore();
  const storeId = store?.id ?? null;

  const [whatsapp, postPurchaseApp, whatsappApp] = await Promise.all([
    storeId ? getPublicWhatsappSettings(storeId) : Promise.resolve(null),
    storeId
      ? prisma.installedApp.findUnique({
          where: { storeId_appSlug: { storeId, appSlug: "post-purchase-flows" } },
          select: { status: true },
        })
      : Promise.resolve(null),
    storeId
      ? prisma.installedApp.findUnique({
          where: { storeId_appSlug: { storeId, appSlug: "whatsapp-recovery" } },
          select: { status: true },
        })
      : Promise.resolve(null),
  ]);

  const whatsappActive =
    whatsappApp?.status === "active" && whatsapp?.status === "active";
  const postPurchaseActive = postPurchaseApp?.status === "active";

  const facts: StatusFact[] = [
    {
      label: "WhatsApp Recovery",
      value: whatsappActive
        ? "Activa — se enviará un template por carrito abandonado"
        : whatsappApp
        ? "Instalada pero sin credenciales"
        : "No instalada",
      tone: whatsappActive ? "ok" : whatsappApp ? "warn" : "muted",
    },
    {
      label: "Post-purchase flows",
      value: postPurchaseActive
        ? "Activos — review request y reorder reminder"
        : postPurchaseApp
        ? "Instalada pero pausada"
        : "No instalada",
      tone: postPurchaseActive ? "ok" : postPurchaseApp ? "warn" : "muted",
    },
  ];

  return (
    <SettingsCategoryPanel
      eyebrow="Comunicación"
      title="WhatsApp y mensajes al cliente"
      description="Nexora sólo envía mensajes al cliente a través de apps explícitas, activas y con credenciales reales. Cada canal degrada en silencio cuando falta configuración — nunca enviamos genéricos."
      icon={MessageSquare}
      facts={facts}
      actions={[
        {
          href: whatsappApp ? "/admin/apps/whatsapp-recovery/setup" : "/admin/apps/whatsapp-recovery",
          label: whatsappApp ? "Configurar WhatsApp Recovery" : "Instalar WhatsApp Recovery",
          variant: "primary",
        },
        {
          href: postPurchaseApp
            ? "/admin/apps/post-purchase-flows/setup"
            : "/admin/apps/post-purchase-flows",
          label: postPurchaseApp ? "Configurar post-purchase" : "Instalar post-purchase",
          variant: "secondary",
        },
      ]}
    >
      <p>
        La operación real (templates aprobados, delays, cron windows) vive dentro de cada app en{" "}
        <strong>Apps</strong>. Desde acá podés saltar directo al setup sin navegar la pantalla completa de
        apps instaladas.
      </p>
    </SettingsCategoryPanel>
  );
}
