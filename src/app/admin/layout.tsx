import { getActiveStoreInfo } from "@/lib/store-engine/admin/queries";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const store = await getActiveStoreInfo();

  // CRITICAL: Auth validation - redirect to login if no session
  if (!store.id) {
    const { redirect } = await import("next/navigation");
    redirect("/home/login");
  }

  // Enforce commercial onboarding
  const { resolvePostAuthDestination } = await import("@/lib/onboarding-commercial/actions");
  const { destination, reason } = await resolvePostAuthDestination();

  if (reason !== "active") {
     const { redirect } = await import("next/navigation");
     redirect(destination);
  }

  const initials = store.name
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <AdminShell storeName={store.name} storeInitials={initials}>
      {children}
    </AdminShell>
  );
}
