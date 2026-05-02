"use client";

import { Apple } from "lucide-react";

type SocialMode = "login" | "register";

interface SocialAuthButtonsProps {
  action: (formData: FormData) => void | Promise<void>;
  mode: SocialMode;
  pending?: boolean;
}

const providers = [
  { id: "apple", label: "Apple" },
  { id: "google", label: "Google" },
  { id: "facebook", label: "Facebook" },
] as const;

export function SocialAuthButtons({ action, mode, pending = false }: SocialAuthButtonsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-[var(--hairline)]" />
        <span className="text-[12px] text-ink-6">o</span>
        <span className="h-px flex-1 bg-[var(--hairline)]" />
      </div>

      <div className="flex justify-center gap-2.5">
        {providers.map((provider) => (
          <form key={provider.id} action={action}>
            <input type="hidden" name="provider" value={provider.id} />
            <input type="hidden" name="mode" value={mode} />
            <button
              type="submit"
              disabled={pending}
              title={`${mode === "register" ? "Crear cuenta" : "Iniciar sesion"} con ${provider.label}`}
              aria-label={`${mode === "register" ? "Crear cuenta" : "Iniciar sesion"} con ${provider.label}`}
              className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-white text-ink-0 transition-colors hover:border-[color:var(--hairline-strong)] hover:bg-[var(--surface-1)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
            >
              <SocialIcon provider={provider.id} />
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}

export function getSocialAuthErrorMessage(code: string | null): string | null {
  switch (code) {
    case "denied":
      return "El proveedor cancelo el acceso antes de finalizar.";
    case "state":
      return "La sesion social expiro. Volve a intentarlo.";
    case "code":
      return "El proveedor no devolvio el codigo de acceso.";
    case "provider":
      return "El proveedor social no pudo completar la solicitud.";
    case "callback":
      return "No pudimos completar el inicio social. Revisa credenciales y callback URL.";
    default:
      return null;
  }
}

function SocialIcon({ provider }: { provider: (typeof providers)[number]["id"] }) {
  if (provider === "apple") {
    return <Apple className="h-5 w-5" strokeWidth={2} />;
  }

  if (provider === "facebook") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1877F2] text-[14px] font-semibold leading-none text-white">
        f
      </span>
    );
  }

  return (
    <span className="text-[18px] font-semibold leading-none">
      <span className="text-[#4285F4]">G</span>
    </span>
  );
}
