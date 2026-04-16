import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentStore } from "@/lib/auth/session";

export default async function WelcomeLayout({ children }: { children: ReactNode }) {
  const store = await getCurrentStore();
  if (!store) {
    redirect("/home/login");
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans antialiased">
      {/* Ultra-minimal header — editorial style */}
      <header className="px-6 sm:px-10 py-5 flex items-center justify-between border-b border-[#EAEAEA]">
        <div className="flex items-center gap-2.5">
          <div className="relative w-7 h-7 flex items-center justify-center overflow-hidden">
             <div className="absolute inset-0 bg-[#111111] rounded-lg rotate-12" />
             <div className="absolute w-2 h-2 bg-emerald-500 rounded-[3px] -ml-1.5 -mt-1.5" />
             <div className="absolute w-2 h-2 bg-white rounded-[3px] ml-1.5 mt-1.5" />
          </div>
          <span className="font-extrabold tracking-tighter text-[22px] text-[#111111]">nexora.</span>
        </div>
        <div className="hidden sm:flex items-center gap-6">
          <span className="text-[13px] font-medium text-[#888888]">Configuración de cuenta</span>
          <div className="w-px h-4 bg-[#EAEAEA]" />
          <span className="text-[13px] font-medium text-[#888888]">¿Necesitás ayuda?</span>
        </div>
      </header>

      {/* Main Content Area — centered, constrained */}
      <main className="flex-1 flex flex-col items-center p-5 sm:p-8 md:p-12">
        <div className="w-full max-w-6xl">
          {children}
        </div>
      </main>

      {/* Minimal footer */}
      <footer className="py-6 text-center text-[11px] font-medium text-[#999999] tracking-wide">
        &copy; {new Date().getFullYear()} Nexora Inc. — Infraestructura para ecommerce inteligente.
      </footer>
    </div>
  );
}
