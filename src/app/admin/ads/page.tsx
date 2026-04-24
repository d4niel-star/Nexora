import { redirect } from "next/navigation";

// Backwards-compatible redirect: the old single "Ads" surface has been
// split into one full sidebar leaf per provider (Meta / TikTok / Google)
// plus a dedicated Píxeles y tags hub. Anything (deep-links, OAuth
// callbacks that still emit `/admin/ads?...`, the apps registry, the
// AI suggestions in /admin/ai) can keep pointing at /admin/ads — we
// fall through to Meta as the canonical first surface so the user
// never lands on a 404. Per-provider OAuth callbacks land directly on
// /admin/ads/{provider} now.
export default async function AdsRoot({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") qs.set(key, value);
  }
  const tail = qs.toString();
  redirect(`/admin/ads/meta${tail ? `?${tail}` : ""}`);
}
