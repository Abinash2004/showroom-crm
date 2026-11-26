"use client";

import Link, { useLinkStatus } from "next/link";
import { cn } from "@/lib/cn";

type Tone = "solid" | "tonal";

/** Pebble pill at rest, Obsidian when selected. `tone` is kept for call-site compatibility; both tones select to ink. */
export function chipClass(active: boolean, tone: Tone = "tonal"): string {
  void tone;
  return cn(
    "press inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full px-4 text-sm font-medium tabular-nums transition-colors",
    // Selected: the secondary part (count, remove ✕, picked date) is tagged `.chip-accent` and shows in emerald.
    active ? "bg-ink font-semibold text-white hover:bg-ink/90 [&_.chip-accent]:text-[var(--accent-on-ink)] [&_.chip-accent]:opacity-100" : "bg-surface-2 text-fg hover:bg-surface-2-hover",
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
