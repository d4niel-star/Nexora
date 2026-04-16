import { redirect } from "next/navigation";

export default function RedirectOldBuilderPage() {
  redirect("/admin/ai/store-builder");
}
