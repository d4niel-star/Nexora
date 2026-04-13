"use client";

import { CheckCircle2, Circle, ArrowRight, Zap, Target, Globe2, Store, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";

const STEPS = [
  {
    id: "create_products",
    title: "Crear tu catálogo",
    description: "Generá productos enteros con AI Studio o cargalos manualmente.",
    href: "/admin/ai-store-builder",
    icon: Zap,
    cta: "Generar con IA"
  },
  {
    id: "connect_channel",
    title: "Conectar canales",
    description: "Autenticá Mercado Libre o Shopify para venta exterior.",
    href: "/admin/channels",
    icon: Globe2,
    cta: "Ir a Canales"
  },
  {
    id: "publish_channel",
    title: "Publicar productos",
    description: "Sincronizá tu stock interno hacia el canal.",
    href: "/admin/publications",
    icon: Target,
    cta: "Publicar ahora"
  },
  {
    id: "import_supplier",
    title: "Dropshipping B2B (Opcional)",
    description: "Importá productos desde un proveedor para re-vender sin inventario.",
    href: "/admin/sourcing",
    icon: Package,
    cta: "Explorar Proveedores"
  },
  {
    id: "custom_domain",
    title: "Publicar Tienda",
    description: "Elegí tu dominio y abrí las puertas de tu tienda propia.",
    href: "/admin/store?tab=dominio",
    icon: Store,
    cta: "Configurar Dominio"
  }
];

export function OnboardingDashboard({ data }: { data: any }) {
  const { score, stepsCompleted } = data;
  
  return (
    <div className="mx-auto max-w-4xl pt-8 pb-16 animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#111111]">
          Bienvenido a Nexora
        </h1>
        <p className="mt-2 text-[15px] text-[#555555] max-w-2xl leading-relaxed">
          Completá estos pasos para activar el ecosistema completo: catálogo centralizado, dropshipping B2B e IA, todo listo para escalar en múltiples canales simultáneamente.
        </p>
      </div>

      <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 shadow-sm mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-[#111111]">Tu progreso de activación</h2>
          <span className="text-[13px] font-bold text-emerald-600">{score}% Completo</span>
        </div>
        <div className="w-full bg-[#f0f0f0] rounded-full h-2 overflow-hidden">
          <div className="bg-emerald-500 h-full transition-all duration-1000 ease-out" style={{ width: `${score}%` }} />
        </div>
      </div>

      <div className="space-y-4">
        {STEPS.map((step, idx) => {
          const isDone = stepsCompleted.includes(step.id);
          const Icon = step.icon;
          
          return (
            <div 
              key={step.id}
              className={cn(
                "group flex flex-col md:flex-row md:items-center justify-between p-6 rounded-2xl border transition-all duration-300",
                isDone ? "bg-[#FAFAFA] border-[#E5E5E5] opacity-70" : "bg-white border-[#DDDDDD] hover:border-[#111111] hover:shadow-md"
              )}
            >
              <div className="flex gap-5">
                <div className="mt-1 flex-shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  ) : (
                    <Circle className="h-6 w-6 text-[#CCCCCC]" />
                  )}
                </div>
                <div>
                  <h3 className={cn("font-bold text-[16px]", isDone ? "text-[#555555] line-through" : "text-[#111111]")}>
                    {idx + 1}. {step.title}
                  </h3>
                  <p className="mt-1 text-[14px] text-[#777777] max-w-md">
                    {step.description}
                  </p>
                </div>
              </div>

              <div className="mt-6 md:mt-0 md:ml-6 flex-shrink-0">
                {!isDone ? (
                   <Link 
                     href={step.href}
                     className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-black focus:ring-2 focus:ring-black focus:ring-offset-2"
                   >
                     {step.cta} <ArrowRight className="h-4 w-4" />
                   </Link>
                ) : (
                   <Link 
                     href={step.href}
                     className="inline-flex flex-col items-end gap-1 text-[12px] font-semibold text-[#888888] hover:text-[#111111] transition-colors"
                   >
                     Revisar ajustes
                   </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {score === 100 && (
         <div className="mt-12 bg-emerald-50 border border-emerald-200 text-emerald-800 p-6 rounded-2xl flex items-start gap-4">
            <CheckCircle2 className="h-6 w-6 shrink-0 mt-0.5" />
            <div>
               <h3 className="font-bold text-[15px]">¡Activación Completa!</h3>
               <p className="mt-1 text-[13px]">Has conectado los motores principales. Ya puedes procesar transacciones reales. Visita el dashboard general para métricas de ventas.</p>
            </div>
         </div>
      )}
    </div>
  );
}
