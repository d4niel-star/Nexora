import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";

import { getCurrentStore } from "@/lib/auth/session";
import { CARRIERS } from "@/lib/shipping/registry";
import { listCarrierSummaries } from "@/lib/shipping/store-connection";
import { getStoreShippingSettings } from "@/lib/shipping/store-settings";
import { ShippingSettingsForm } from "@/components/admin/shipping/ShippingSettingsForm";

export const metadata = {
  title: "Ajustes de envío | Nexora",
};

export const dynamic = "force-dynamic";

export default async function ShippingSettingsPage() {
  const store = await getCurrentStore();
  if (!store) redirect("/home/login");

  const [settings, summaries] = await Promise.all([
    getStoreShippingSettings(store.id),
    listCarrierSummaries(store.id),
  ]);

  const carriers = CARRIERS.map((meta) => ({
    id: meta.id,
    name: meta.name,
    connected:
      summaries.find((s) => s.carrier === meta.id)?.status === "connected",
  }));

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="animate-in fade-in space-y-8 py-2 duration-300">
        <header className="space-y-3">
          <Link
            href="/admin/shipping"
            className="inline-flex w-fit items-center gap-1.5 text-[12px] font-medium text-ink-5 transition-colors hover:text-ink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
            Envíos
          </Link>
          <div className="space-y-2">
            <h1 className="text-[28px] font-semibold leading-[1.08] tracking-[-0.035em] text-ink-0 lg:text-[32px]">
              Ajustes de envío
            </h1>
            <p className="max-w-2xl text-[13px] leading-[1.55] text-ink-5">
              Definí el origen, el carrier por defecto y las dimensiones del
              paquete estándar. Estos valores se usan en cada cotización,
              etiqueta y consulta de tracking.
            </p>
          </div>
        </header>

        <ShippingSettingsForm initial={settings} carriers={carriers} />
      </div>
    </div>
  );
}
