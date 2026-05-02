import type { ReactNode } from "react";

import { AdminPageHeader } from "@/components/admin/layout/AdminPageHeader";

// Settings is already represented by the dashboard cards rendered by
// /admin/settings. This shell only provides the shared page header so
// categories are not repeated in a second local navigation panel.
export function SettingsShell({ children }: { children: ReactNode }) {
  return (
    <div className="animate-in fade-in duration-500">
      <AdminPageHeader
        eyebrow="Configuración"
        title="Configuración"
        subtitle="Ajustes transversales de tu tienda y tu cuenta. Cada categoría agrupa settings reales del producto; los módulos operativos (ventas, catálogo, operaciones, growth) viven en su propia sección del menú."
      />

      <div className="min-w-0">{children}</div>
    </div>
  );
}
