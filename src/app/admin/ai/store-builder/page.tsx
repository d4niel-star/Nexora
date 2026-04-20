import { redirect } from "next/navigation";

// Tienda IA was promoted to a top-level module at /admin/store-ai.
// This path remains as a permanent redirect so old bookmarks, email
// links and any cached revalidation paths keep resolving.
export default function RedirectLegacyStoreBuilder() {
  redirect("/admin/store-ai");
}
