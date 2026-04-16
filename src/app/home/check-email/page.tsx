"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail } from "lucide-react"

export default function CheckEmailPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] p-4 font-sans">
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
        <CardHeader className="text-center pt-8 pb-2">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
              <Mail className="w-8 h-8 text-emerald-600" />
            </div>
          </div>
          <CardTitle className="text-xl font-bold tracking-tight text-[#111111]">Revisá tu correo electrónico</CardTitle>
        </CardHeader>
        <CardContent className="px-8 pb-8 text-center">
          <p className="text-gray-500 text-sm mb-2 leading-relaxed">
            Te enviamos un email de verificación con un enlace para activar tu cuenta.
          </p>
          <p className="text-gray-400 text-xs mb-8 leading-relaxed">
            Si no lo encontrás, revisá la carpeta de spam. El enlace expira en 24 horas.
          </p>

          <div className="border-t border-gray-100 pt-6">
            <p className="text-gray-500 text-sm">
              ¿Ya verificaste? <Link href="/home/login" className="text-emerald-600 underline font-semibold hover:text-emerald-700">Iniciar sesión</Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
