import Link from "next/link";
import {
  Store,
  Palette,
  FileText,
  CreditCard,
  Crown,
  Users,
  Megaphone,
  BarChart3,
  Plug,
  Activity,
  LifeBuoy
} from "lucide-react";

const sections = [
  {
    title: "Negocio",
    items: [
      { name: "Mi Tienda", href: "/admin/store", icon: Store,   desc: "Configuración general, horarios y contacto" },
      { name: "Branding y Dominio", href: "/admin/store", icon: Palette, desc: "Personalización visual y dominios personalizados" },
      { name: "Legal & ARCA", href: "/admin/fiscal/settings", icon: FileText, desc: "Facturación electrónica y políticas legales" }
    ]
  },
  {
    title: "Comercial",
    items: [
      { name: "Plan y créditos", href: "/admin/billing", icon: Crown, desc: "Suscripción, límites y compra de créditos IA" },
      { name: "Finanzas", href: "/admin/finances", icon: CreditCard, desc: "Cuentas bancarias y retiros" }
    ]
  },
  {
    title: "Crecimiento",
    items: [
      { name: "Clientes", href: "/admin/customers", icon: Users, desc: "Gestor de usuarios, compras y audiencias" },
      { name: "Marketing", href: "#", icon: Megaphone, desc: "Mailing, automatizaciones y descuentos", comingSoon: true },
      { name: "Analíticas", href: "#", icon: BarChart3, desc: "Ventas, conversiones y tráfico", comingSoon: true }
    ]
  },
  {
    title: "Plataforma",
    items: [
      { name: "Integraciones", href: "/admin/integrations", icon: Plug, desc: "Apps de terceros, APIs y Webhooks" },
      { name: "Sistema", href: "#", icon: Activity, desc: "Team, roles, auditoría y seguridad", comingSoon: true },
      { name: "Soporte", href: "#", icon: LifeBuoy, desc: "Centro de ayuda y tickets técnicos", comingSoon: true }
    ]
  }
];

export default function SettingsHubPage() {
  return (
    <div className="animate-in fade-in space-y-10 duration-500 py-6">
      
      {/* Header */}
      <div>
         <h1 className="text-[28px] font-extrabold tracking-tight text-ink-0 leading-none">Configuración</h1>
         <p className="mt-2 text-[13px] text-ink-6">
            Administrá todos los aspectos de tu negocio, suscripción y operaciones de plataforma.
         </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
        {sections.map((section) => (
          <div key={section.title} className="space-y-4">
             <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-6 border-b border-[color:var(--hairline)] pb-2">
                {section.title}
             </h2>
             <ul className="space-y-2">
               {section.items.map((item) => {
                 const Icon = item.icon;
                 return (
                   <li key={item.name}>
                     {item.comingSoon ? (
                       <div className="group flex items-start gap-4 p-3 rounded-2xl border border-transparent opacity-50 grayscale select-none">
                         <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-2)]/80 text-ink-6">
                           <Icon className="h-4 w-4" />
                         </div>
                         <div className="w-full">
                           <div className="flex items-center justify-between">
                             <h3 className="text-sm font-bold text-ink-0">{item.name}</h3>
                             <span className="text-[9px] font-black uppercase tracking-widest text-ink-6 bg-[var(--surface-2)] px-2 py-0.5 rounded-full">Próximamente</span>
                           </div>
                           <p className="mt-0.5 text-[13px] font-medium text-ink-6 leading-snug">
                             {item.desc}
                           </p>
                         </div>
                       </div>
                     ) : (
                       <Link 
                         href={item.href}
                         className="group flex items-start gap-4 p-3 rounded-2xl hover:bg-[var(--surface-0)] hover:shadow-[var(--shadow-soft)] border border-transparent hover:border-[color:var(--hairline)] transition-all"
                       >
                         <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-2)]/80 text-ink-6 transition-colors group-hover:bg-ink-0 group-hover:text-white">
                           <Icon className="h-4 w-4" />
                         </div>
                         <div>
                           <h3 className="text-sm font-bold text-ink-0">{item.name}</h3>
                           <p className="mt-0.5 text-[13px] font-medium text-ink-6 leading-snug">
                             {item.desc}
                           </p>
                         </div>
                       </Link>
                     )}
                   </li>
                 )
               })}
             </ul>
          </div>
        ))}
      </div>

    </div>
  );
}
