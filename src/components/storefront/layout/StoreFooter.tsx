import Link from "next/link";
import type { StoreConfig } from "@/types/storefront";

export function StoreFooter({ config }: { config: StoreConfig }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 border-t border-gray-200" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        Navegacion secundaria
      </h2>
      <div className="mx-auto max-w-7xl px-4 pb-8 pt-16 sm:px-6 lg:px-8 lg:pt-24">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="space-y-8 xl:col-span-1">
            {config.logoUrl ? (
              <img src={config.logoUrl} alt={config.name} className="h-8 w-auto mix-blend-multiply" />
            ) : (
              <span className="text-2xl font-black tracking-tight text-gray-900 uppercase">
                {config.name}
              </span>
            )}
            <p className="text-sm font-medium text-gray-500 max-w-xs">
              {config.description}
            </p>
          </div>
          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            {config.footerNavigation.map((group, idx) => (
              <div key={idx}>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-900">{group.title}</h3>
                <ul role="list" className="mt-6 space-y-4">
                  {group.items.map((item) => (
                    <li key={item.label}>
                      <Link href={item.href} className="text-sm font-medium text-gray-500 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black">
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-900">Newsletter</h3>
              <p className="mt-6 text-sm font-medium text-gray-500 max-w-sm">Enterate de nuevos lanzamientos y promociones especiales.</p>
              <form className="mt-4 sm:flex sm:max-w-md">
                <label htmlFor="email-address" className="sr-only">Email address</label>
                <input
                  type="email"
                  name="email-address"
                  id="email-address"
                  autoComplete="email"
                  required
                  className="w-full min-w-0 appearance-none rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                  placeholder="Ingresa tu email"
                />
                <div className="mt-3 rounded-md sm:ml-3 sm:mt-0 sm:shrink-0">
                  <button
                    type="button"
                    className="flex w-full items-center justify-center rounded-md bg-gray-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                  >
                    Suscribirse
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* ─── Legal & Compliance ─── */}
        <div className="mt-12 flex flex-col items-center border-t border-gray-200 pt-8 sm:mt-16 bg-gray-50/50">
           <div className="flex flex-wrap justify-center gap-6 mb-8 mt-2">
              <Link href={`/${config.slug}/legal?policy=privacy`} className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors uppercase tracking-wider">Política de Privacidad</Link>
              <Link href={`/${config.slug}/legal?policy=terms`} className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors uppercase tracking-wider">Términos y Condiciones</Link>
              <Link href={`/${config.slug}/legal?policy=refunds`} className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors uppercase tracking-wider">Política de Devoluciones</Link>
           </div>
           
           <div className="w-full max-w-sm">
             <Link href={`/${config.slug}/arrepentimiento`} className="group flex items-center justify-center gap-2 w-full px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm hover:shadow-md hover:border-black transition-all">
               <span className="w-2 h-2 rounded-full bg-red-500 group-hover:animate-pulse" />
               <span className="text-sm font-bold text-gray-900 tracking-tight">Botón de Arrepentimiento</span>
             </Link>
             <p className="text-[10px] text-center text-gray-400 mt-3 font-medium">Cumplimiento Resolución 424/2020 Secretaría de Comercio Interior</p>
           </div>
        </div>
        <div className="mt-16 border-t border-gray-200 pt-8 sm:mt-20 flex flex-col md:flex-row md:items-center md:justify-between">
          <p className="text-xs font-medium text-gray-400">
            &copy; {currentYear} {config.name}. Todos los derechos reservados.
          </p>
          <div className="mt-4 flex space-x-6 md:mt-0">
             <span className="text-xs font-bold text-gray-300">Powered by <span className="text-gray-400">Nexora</span></span>
          </div>
        </div>
      </div>
    </footer>
  );
}
