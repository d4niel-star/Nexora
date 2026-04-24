import { redirect } from "next/navigation";

// /admin/operations is no longer a first-class sidebar surface. Its data
// (alerts on pedidos / inventario / catálogo / sourcing / AI) is a strict
// subset of the Command Center at /admin/dashboard, so we permanently
// redirect to keep deep-links and bookmarks working.
export default function OperationsRedirect() {
  redirect("/admin/dashboard");
}
