import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "tonal" | "outline" | "danger" | "ghost" | "ink" | "ink-accent";

const base =
  "press inline-flex min-h-12 min-w-12 select-none items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  /** Racing Emerald: the main action on a screen. */
  primary: "bg-primary text-on-primary hover:bg-primary-hover",
  /** Pebble: secondary actions. */
  tonal: "bg-surface-2 text-fg hover:bg-surface-2-hover",
  outline: "bg-surface-2 text-fg hover:bg-surface-2-hover",
  danger: "bg-danger-soft text-on-danger-soft hover:brightness-95",
  ghost: "text-fg hover:bg-surface-2",
  /** Obsidian: selected state / dark utility. */
  ink: "bg-ink text-white hover:bg-ink/90",
  /** Obsidian with bright emerald text, like selected chips (sign in / sign up). */
  "ink-accent": "bg-ink text-[var(--accent-on-ink)] hover:bg-ink/90",
};

export const buttonClass = (variant: Variant = "primary", extra?: string): string => cn(base, variants[variant], extra);

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}

interface LinkButtonProps extends ComponentProps<typeof Link> {
  variant?: Variant;
}

export function LinkButton({ variant = "primary", className, ...props }: LinkButtonProps) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}
