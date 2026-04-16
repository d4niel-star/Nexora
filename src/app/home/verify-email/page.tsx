"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react"

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const status = searchParams.get("status")

  const config: Record<string, { icon: React.ReactNode; title: string; description: string; showLogin: boolean }> = {
    success: {
      icon: <CheckCircle2 className="w-12 h-12 text-emerald-500" />,
      title: "Email verificado correctamente",
      description: "Tu dirección de correo fue confirmada. Ya podés iniciar sesión y acceder a tu plataforma.",
      showLogin: true,
    },
    expired: {
      icon: <Clock className="w-12 h-12 text-amber-500" />,
      title: "El enlace expiró",
      description: "Este enlace de verificación ya no es válido. Iniciá sesión para solicitar uno nuevo.",
      showLogin: true,
    },
    used: {
      icon: <AlertTriangle className="w-12 h-12 text-amber-500" />,
      title: "Enlace ya utilizado",
      description: "Este enlace de verificación ya fue consumido. Si tu email ya está verificado, podés iniciar sesión normalmente.",
      showLogin: true,
    },
    invalid: {
      icon: <XCircle className="w-12 h-12 text-red-500" />,
      title: "Enlace no válido",
      description: "El enlace de verificación no es correcto. Verificá que estés usando el enlace completo del correo que recibiste.",
      showLogin: true,
    },
  }

  const current = config[status || ""] || config.invalid

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
          <div className="flex justify-center mb-4">{current.icon}</div>
          <CardTitle className="text-xl font-bold tracking-tight text-[#111111]">{current.title}</CardTitle>
        </CardHeader>
        <CardContent className="px-8 pb-8 text-center">
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">{current.description}</p>
          {current.showLogin && (
            <Link href="/home/login" className="inline-flex w-full items-center justify-center bg-[#111111] hover:bg-black text-white rounded-xl py-4 font-semibold text-base shadow-lg transition-all hover:-translate-y-0.5">
              Ir al inicio de sesión
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]"><p className="text-gray-400">Cargando...</p></div>}>
      <VerifyEmailContent />
    </Suspense>
  )
}
