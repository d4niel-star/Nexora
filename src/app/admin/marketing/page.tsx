import { redirect } from "next/navigation";
import { resolveActor } from "@/lib/rbac/guard";
import { roleHasPermission } from "@/lib/rbac/permissions";
import { getMarketingReadiness } from "@/lib/marketing/eligibility";
import { MARKETING_TEMPLATES } from "@/lib/marketing/templates";
import { MarketingClient } from "./MarketingClient";

export default async function MarketingPage() {
  const actor = await resolveActor();
  if (!actor) redirect("/admin/dashboard");
  if (!roleHasPermission(actor.role, "marketing.read")) {
    redirect("/admin/dashboard");
  }

  const readiness = await getMarketingReadiness(actor.storeId);

  return (
    <MarketingClient
      readiness={readiness}
      templates={MARKETING_TEMPLATES}
      canManage={roleHasPermission(actor.role, "marketing.manage")}
    />
  );
}
