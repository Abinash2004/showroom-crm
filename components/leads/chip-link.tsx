"use client";

import Link, { useLinkStatus } from "next/link";
import { cn } from "@/lib/cn";

type Tone = "solid" | "tonal";

export function chipClass(active: boolean, tone: Tone = "tonal"): string {
  return cn(
    "press inline-flex min-h-12 shrink-0 items-center whitespace-nowrap rounded-full border px-4 text-sm font-medium",
    active
      ? tone === "solid"
        ? "border-transparent bg-primary text-on-primary"
        : "border-transparent bg-primary-soft text-on-primary-soft"
      : "border-line bg-surface text-fg",
  );
}

function ChipContent({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus();
  return <span className={cn("inline-flex items-center gap-2 transition-opacity duration-150", pending && "animate-pulse opacity-60")}>{children}</span>;
}

interface ChipLinkProps {
  href: string;
  active?: boolean;
  tone?: Tone;
  label?: string;
  children: React.ReactNode;
}

/**
 * Filter chip. Uses `replace` so filter changes don't pile up in the back stack (Android back leaves the list),
 * and skips prefetch because every prefetch of this dynamic route would hit the auth layer.
 */
export function ChipLink({ href, active = false, tone = "tonal", label, children }: ChipLinkProps) {
  return (
    <Link
      href={href}
      replace
      scroll={false}
      prefetch={false}
      aria-current={active ? "true" : undefined}
      aria-label={label}
      className={chipClass(active, tone)}
    >
      <ChipContent>{children}</ChipContent>
    </Link>
  );
}
