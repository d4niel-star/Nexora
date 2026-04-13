"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] p-4 font-sans">
      
      {/* Nexora Logo */}
      <div className="mb-10">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="relative w-10 h-10 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-[#111111] rounded-[10px] rotate-12 shadow-sm" />
            <div className="absolute w-3 h-3 bg-emerald-500 rounded-sm -ml-2.5 -mt-2.5 shadow-sm" />
            <div className="absolute w-3 h-3 bg-white rounded-sm ml-2.5 mt-2.5 shadow-sm" />
          </div>
          <span className="font-extrabold tracking-tighter text-3xl text-[#111111]">nexora.</span>
        </Link>
      </div>

      <Card className="w-full max-w-md shadow-2xl shadow-gray-200/50 border-[#EAEAEA] rounded-2xl overflow-hidden">
        <CardHeader className="text-center pt-8 pb-4">
          <CardTitle className="text-2xl font-bold tracking-tight text-[#111111]">Crear Nueva Cuenta</CardTitle>
          <CardDescription className="text-gray-500 text-sm mt-2">
            Comenzá a potenciar tu operación en minutos.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <form className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Nombre de la Empresa
              </label>
              <Input id="name" type="text" placeholder="Ej: TechStore Argentina" required className="border-gray-200 focus-visible:ring-emerald-500 rounded-xl" />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Correo Electrónico
              </label>
              <Input id="email" type="email" placeholder="tu@empresa.com" required className="border-gray-200 focus-visible:ring-emerald-500 rounded-xl" />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Contraseña
              </label>
              <Input id="password" type="password" required className="border-gray-200 focus-visible:ring-emerald-500 rounded-xl" />
            </div>

            <Button 
                type="button" 
                className="w-full mt-6 bg-[#111111] hover:bg-black text-white rounded-xl py-6 font-semibold text-lg shadow-lg transition-all hover:-translate-y-0.5" 
                onClick={() => window.location.href = '/login'}
            >
              Registrar mi empresa
            </Button>
          </form>

          <div className="mt-8 text-center text-sm border-t border-gray-100 pt-6">
            <p className="text-gray-500">
              ¿Ya tenés una cuenta? <Link href="/login" className="text-emerald-600 underline font-semibold hover:text-emerald-700">Ingresar ahora</Link>
            </p>
          </div>
        </CardContent>
      </Card>
      
      <p className="mt-8 text-center text-xs text-gray-400 max-w-sm font-medium">
        Modo local: Al hacer click en registrar, simularemos la creación de tu cuenta y te redirigiremos automáticamente al inicio de sesión.
      </p>
    </div>
  )
}
