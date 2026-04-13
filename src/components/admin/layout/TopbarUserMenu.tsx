"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { 
  Building2,
  Crown,
  LogOut,
  Settings,
  Zap,
  Activity,
  LifeBuoy
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface TopbarUserMenuProps {
   storeName: string;
   storeInitials: string;
}

export function TopbarUserMenu({ storeName, storeInitials }: TopbarUserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    // Clear all cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    localStorage.clear();
    sessionStorage.clear();

    // Hard-navigate to the public login page on the root domain
    const port = window.location.port ? `:${window.location.port}` : "";
    window.location.href = `${window.location.protocol}//localhost${port}/login`;
  };

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center h-8 w-8 rounded-full bg-[#111111] text-xs font-bold text-white shadow-sm ring-2 ring-transparent transition-all hover:ring-[#EAEAEA] active:scale-95"
      >
        {storeInitials}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-xl border border-[#EAEAEA] bg-white shadow-xl shadow-black/5 animate-in fade-in zoom-in-95 duration-150 z-50 overflow-hidden">
           
           <div className="px-4 py-3 border-b border-[#F0F0F0] bg-[#FAFAFA]">
             <p className="text-xs font-medium text-[#888888]">Workspace Activo</p>
             <p className="font-bold text-[#111111] truncate">{storeName}</p>
             <button className="mt-2 w-full text-left text-[11px] font-bold text-[#888888] hover:text-[#111111] transition-colors flex items-center justify-between">
                <span>Cambiar tienda</span>
                <Building2 className="w-3 h-3" />
             </button>
           </div>

           <div className="px-3 py-2 border-b border-[#F0F0F0]">
              <div className="flex items-center justify-between px-2 py-1.5 rounded disabled opacity-70">
                 <div className="flex items-center gap-2">
                    <Crown className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-[12px] font-bold text-[#111111]">Plan Starter</span>
                 </div>
                 <Link href="/admin/billing" onClick={() => setIsOpen(false)} className="text-[10px] uppercase font-bold text-emerald-600 hover:text-emerald-700 tracking-wider">Upgrade</Link>
              </div>
              <div className="flex items-center justify-between px-2 py-1.5 rounded disabled opacity-70 mt-1">
                 <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-[#888888]" />
                    <span className="text-[12px] font-medium text-[#555555]">Créditos IA</span>
                 </div>
                 <span className="text-[11px] font-mono text-[#888888]">1,050</span>
              </div>
           </div>

           <div className="px-2 py-2">
              <Link href="/admin/settings" onClick={() => setIsOpen(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-[#555555] hover:bg-[#FAFAFA] hover:text-[#111111] transition-colors">
                 <Settings className="w-4 h-4 text-[#888888]" />
                 Configuración General
              </Link>
              <Link href="/admin/support" onClick={() => setIsOpen(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-[#555555] hover:bg-[#FAFAFA] hover:text-[#111111] transition-colors">
                 <LifeBuoy className="w-4 h-4 text-[#888888]" />
                 Soporte
              </Link>
              <div className="flex items-center justify-between px-3 py-2">
                 <div className="flex items-center gap-2.5">
                    <Activity className="w-4 h-4 text-[#888888]" />
                    <span className="text-[13px] font-medium text-[#555555]">Estado del sistema</span>
                 </div>
                 <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </div>
           </div>

           <div className="px-2 py-2 border-t border-[#F0F0F0] bg-[#FAFAFA]/50">
              <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-bold text-red-600 hover:bg-red-50 transition-colors">
                 <LogOut className="w-4 h-4" />
                 Cerrar Sesión
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
