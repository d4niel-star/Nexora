import * as React from "react"
import { cn } from "@/lib/utils"

// ─── Input ───
// Mobile-first: 44px tap target, 16px font to prevent iOS zoom.
// Focus uses the accent ring via `var(--shadow-focus)` — no border-color flash.
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-[var(--r-md)] border border-[color:var(--hairline)] bg-surface text-ink-0",
          "px-3.5 py-2 text-[15px] leading-normal",
          "placeholder:text-ink-6",
          "transition-[box-shadow,border-color] duration-[var(--dur-base)] ease-[var(--ease-out)]",
          "focus-visible:outline-none focus-visible:border-[var(--accent-500)] focus-visible:shadow-[var(--shadow-focus)]",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-ink-11",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
