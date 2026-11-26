import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "tonal" | "outline" | "danger" | "ghost";

const base =
  "press inline-flex min-h-12 min-w-12 select-none items-center justify-center gap-2 rounded-full px-5 text-base font-medium disabled:pointer-events-none disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary",
  tonal: "bg-primary-soft text-on-primary-soft",
  outline: "border border-line bg-surface text-fg",
  danger: "bg-danger text-bg",
  ghost: "text-fg",
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