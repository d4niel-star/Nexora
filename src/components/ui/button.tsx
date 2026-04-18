import * as React from "react"
import { cn } from "@/lib/utils"

// ─── Button ───
// Single source for all CTAs. Variants map 1:1 to the ink/accent token scale.
// `default` is the primary commerce CTA (ink-0 on ink-12); `accent` is reserved
// for conversion-critical moments; `ghost` and `outline` sit at lower hierarchy.
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "secondary" | "accent" | "danger"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const variants = {
      default: "bg-ink-0 text-ink-12 hover:bg-ink-2",
      accent: "bg-[var(--accent-500)] text-[var(--accent-ink)] hover:bg-[var(--accent-600)]",
      secondary: "bg-ink-11 text-ink-1 border border-[color:var(--hairline)] hover:bg-ink-10",
      outline: "border border-[color:var(--hairline-strong)] bg-transparent text-ink-0 hover:bg-ink-11",
      ghost: "bg-transparent text-ink-2 hover:bg-ink-10",
      danger: "bg-[var(--signal-danger)] text-ink-12 hover:brightness-95",
    }

    const sizes = {
      default: "h-11 px-5 text-sm",
      sm: "h-9 px-3.5 text-[13px]",
      lg: "h-12 px-7 text-[15px]",
      icon: "h-10 w-10",
    }

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-[var(--r-md)] font-medium tracking-[-0.005em]",
          "transition-[background-color,color,box-shadow,transform] duration-[var(--dur-base)] ease-[var(--ease-out)]",
          "focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
          "active:translate-y-px",
          "disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
