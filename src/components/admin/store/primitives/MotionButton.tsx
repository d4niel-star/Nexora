"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

// ─── Motion button ──────────────────────────────────────────────────────
// A single motion-aware button used across the Mi tienda surface. Hover,
// press, focus and loading animations are baked in so callers don't have
// to wire them per-screen. Variants map 1:1 to the design tokens (ink-0
// primary, ghost, outline, danger). Animations stay subtle:
//   - hover: y: -1, shadow lift (8ms easing)
//   - press: scale: 0.98 (mass-spring)
//   - focus: shadow-focus token
//   - loading: opacity dimming + leading spinner if `loading` is true

type Variant = "primary" | "outline" | "ghost" | "danger" | "subtle";
type Size = "sm" | "md" | "lg";

export interface MotionButtonProps
  extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-ink-0 text-ink-12 hover:bg-ink-2",
  outline:
    "border border-[color:var(--hairline-strong)] bg-[var(--surface-0)] text-ink-0 hover:bg-[var(--surface-2)]",
  ghost: "bg-transparent text-ink-2 hover:bg-[var(--surface-2)]",
  subtle: "bg-[var(--surface-2)] text-ink-0 hover:bg-[var(--surface-3)]",
  danger: "bg-[var(--signal-danger)] text-ink-12 hover:brightness-95",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3 text-[12px]",
  md: "h-10 px-4 text-[13px]",
  lg: "h-11 px-5 text-[14px]",
};

export const MotionButton = forwardRef<HTMLButtonElement, MotionButtonProps>(
  function MotionButton(
    {
      variant = "primary",
      size = "md",
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className,
      disabled,
      children,
      ...rest
    },
    ref,
  ) {
    const isDisabled = disabled || loading;
    return (
      <motion.button
        ref={ref}
        whileHover={isDisabled ? undefined : { y: -1 }}
        whileTap={isDisabled ? undefined : { scale: 0.98 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        disabled={isDisabled}
        className={cn(
          "relative inline-flex select-none items-center justify-center gap-2 rounded-[var(--r-sm)] font-medium tracking-[-0.01em]",
          "outline-none focus-visible:shadow-[var(--shadow-focus)]",
          "transition-[background-color,color,box-shadow] duration-[var(--dur-base)] ease-[var(--ease-out)]",
          "disabled:cursor-not-allowed disabled:opacity-60",
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && "w-full",
          className,
        )}
        {...rest}
      >
        {loading ? (
          <span
            aria-hidden
            className="absolute left-3 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current"
          />
        ) : leftIcon ? (
          <span aria-hidden className="-ml-0.5 inline-flex h-3.5 w-3.5 items-center">
            {leftIcon}
          </span>
        ) : null}
        <span className={cn("inline-flex items-center", loading && "pl-5 opacity-80")}>
          {children}
        </span>
        {rightIcon && !loading ? (
          <span aria-hidden className="-mr-0.5 inline-flex h-3.5 w-3.5 items-center">
            {rightIcon}
          </span>
        ) : null}
      </motion.button>
    );
  },
);
