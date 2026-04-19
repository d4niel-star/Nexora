import { notFound, redirect } from "next/navigation";

import { getActiveStoreInfo } from "@/lib/store-engine/admin/queries";
import { getAppDetail } from "@/lib/apps/queries";
import { AppDetailPage } from "@/components/admin/apps/AppDetailPage";
import { getAppBySlug } from "@/lib/apps/registry";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const def = getAppBySlug(slug);
  if (!def) return { title: "App no encontrada · Nexora Apps" };
  return {
    title: `${def.name} · Nexora Apps`,
    description: def.shortDescription,
  };
}

export default async function AppDetailRoute({ params }: PageProps) {
  const { slug } = await params;
  const store = await getActiveStoreInfo();
  if (!store.id) redirect("/home/login");

  const item = await getAppDetail(store.id, slug);
  if (!item) notFound();

  return <AppDetailPage item={item} />;
}
