import { redirect } from "next/navigation";

// Backwards-compatible redirect: the canonical Ads surface is now /admin/ads.
export default function AIAdsRedirectPage() {
  redirect("/admin/ads");
}