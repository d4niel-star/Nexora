"use client"

import { useActionState, useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { registerAction } from "@/app/home/auth-actions"
import { validatePasswordPolicy } from "@/lib/auth/password-policy"
import { Check, X } from "lucide-react"

function PasswordStrengthIndicator({ password, email, companyName }: { password: string; email: string; companyName: string }) {
  const result = useMemo(
    () => validatePasswordPolicy(password, { email, companyName }),
    [password, email, companyName]
  )

  if (!password) return null

  const rules = [
    { label: "12+ caracteres", met: password.length >= 12 },
    { label: "Una mayúscula", met: /[A-Z]/.test(password) },
    { label: "Una minúscula", met: /[a-z]/.test(password) },
    { label: "Un número", met: /[0-9]/.test(password) },
    { label: "Un símbolo", met: /[^A-Za-z0-9]/.test(password) },
  ]

  const contextErrors = result.errors.filter(
    (e) => !e.includes("caracteres") && !e.includes("mayúscula") && !e.includes("minúscula") && !e.includes("número") && !e.includes("símbolo")
  )

  return (
    <div className="mt-2 space-y-1.5">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {rules.map((r) => (
          <div key={r.label} className="flex items-center gap-1.5">
            {r.met ? (
              <Check className="w-3 h-3 text-emerald-500 shrink-0" />
            ) : (
              <X className="w-3 h-3 text-gray-300 shrink-0" />
            )}
            <span className={`text-[11px] font-medium ${r.met ? "text-emerald-600" : "text-gray-400"}`}>
              {r.label}
            </span>
          </div>
        ))}
      </div>
      {contextErrors.map((err, i) => (
        <p key={i} className="text-[11px] text-red-500 font-medium">{err}</p>
      ))}
    </div>
  )
}

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(registerAction, undefined)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [email, setEmail] = useState("")
  const [companyName, setCompanyName] = useState("")

  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword

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
          <form className="space-y-5" action={formAction}>
            {state?.error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium">
                {state.error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Nombre de la Empresa
              </label>
              <Input
                id="name" name="name" type="text" placeholder="Ej: TechStore Argentina" required
                className="border-gray-200 focus-visible:ring-emerald-500 rounded-xl"
                value={companyName} onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Correo Electrónico
              </label>
              <Input
                id="email" name="email" type="email" placeholder="tu@empresa.com" required
                className="border-gray-200 focus-visible:ring-emerald-500 rounded-xl"
                value={email} onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Contraseña
              </label>
              <Input
                id="password" name="password" type="password" required
                className="border-gray-200 focus-visible:ring-emerald-500 rounded-xl"
                value={password} onChange={(e) => setPassword(e.target.value)}
              />
              <PasswordStrengthIndicator password={password} email={email} companyName={companyName} />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Confirmar Contraseña
              </label>
              <Input
                id="confirmPassword" name="confirmPassword" type="password" required
                className={`border-gray-200 focus-visible:ring-emerald-500 rounded-xl ${passwordMismatch ? "border-red-300 ring-1 ring-red-200" : ""}`}
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {passwordMismatch && (
                <p className="text-[11px] text-red-500 font-medium">Las contraseñas no coinciden.</p>
              )}
            </div>

            <Button 
                type="submit" 
                disabled={isPending}
                className="w-full mt-6 bg-[#111111] hover:bg-black text-white rounded-xl py-6 font-semibold text-lg shadow-lg transition-all hover:-translate-y-0.5" 
            >
              {isPending ? "Configurando cuenta..." : "Registrar mi empresa"}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm border-t border-gray-100 pt-6">
            <p className="text-gray-500">
              ¿Ya tenés una cuenta? <Link href="/login" className="text-emerald-600 underline font-semibold hover:text-emerald-700">Ingresar ahora</Link>
            </p>
          </div>
        </CardContent>
      </Card>
      
    </div>
  )
}
