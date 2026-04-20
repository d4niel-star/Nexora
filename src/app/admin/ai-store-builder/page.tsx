import { redirect } from "next/navigation";

// Historical legacy redirect — now points directly at the promoted module.
export default function RedirectOldBuilderPage() {
  redirect("/admin/store-ai");
}
