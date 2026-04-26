import { redirect } from "next/navigation";

// `/admin/apps` is the legacy index for Nexora's own apps. The new
// /admin/marketplace surface separates internal Nexora tools from
// third-party apps, so the old index 307-redirects there. The
// /admin/apps/[slug] detail pages are still the source of truth for a
// single app and keep working untouched.

export const metadata = {
  title: "Marketplace · Nexora",
};

export default function AppsIndexPageRedirect() {
  redirect("/admin/marketplace");
}
