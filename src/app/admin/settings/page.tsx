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
      { name: "Marketing", href: "/admin/marketing", icon: Megaphone, desc: "Mailing, automatizaciones y descuentos" },
      { name: "Analíticas", href: "/admin/analytics", icon: BarChart3, desc: "Ventas, conversiones y tráfico" }
    ]
  },
  {
    title: "Plataforma",
    items: [
      { name: "Integraciones", href: "/admin/integrations", icon: Plug, desc: "Apps de terceros, APIs y Webhooks" },
      { name: "Sistema", href: "/admin/system", icon: Activity, desc: "Team, roles, auditoría y seguridad" },
      { name: "Soporte", href: "/admin/support", icon: LifeBuoy, desc: "Centro de ayuda y tickets técnicos" }
    ]
  }
];

export default function SettingsHubPage() {
  return (
    <div className="animate-in fade-in space-y-10 duration-500 py-6">
      
      {/* Header */}
      <div>
         <h1 className="text-[28px] font-extrabold tracking-tight text-[#111111] leading-none">Configuración</h1>
         <p className="mt-2 text-[13px] text-[#888888]">
            Administrá todos los aspectos de tu negocio, suscripción y operaciones de plataforma.
         </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
        {sections.map((section) => (
          <div key={section.title} className="space-y-4">
             <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#888888] border-b border-[#EAEAEA] pb-2">
                {section.title}
             </h2>
             <ul className="space-y-2">
               {section.items.map((item) => {
                 const Icon = item.icon;
                 return (
                   <li key={item.name}>
                     <Link 
                       href={item.href}
                       className="group flex items-start gap-4 p-3 rounded-2xl hover:bg-white hover:shadow-sm border border-transparent hover:border-[#EAEAEA] transition-all"
                     >
                       <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100/50 text-[#888888] transition-colors group-hover:bg-[#111111] group-hover:text-white">
                         <Icon className="h-4 w-4" />
                       </div>
                       <div>
                         <h3 className="text-sm font-bold text-[#111111]">{item.name}</h3>
                         <p className="mt-0.5 text-[13px] font-medium text-[#888888] leading-snug">
                           {item.desc}
                         </p>
                       </div>
                     </Link>
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
