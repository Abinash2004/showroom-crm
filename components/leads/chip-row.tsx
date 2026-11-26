"use client";

import { useEffect, useRef } from "react";
import { CHIP_SCROLLER } from "@/lib/chip-classes";
import { cn } from "@/lib/cn";

interface ChipRowProps {
  /** Changes whenever the selection changes; the row then scrolls back to its start, where the selected chip now sits. */
  resetKey: string;
  label: string;
  className?: string;
  children: React.ReactNode;
}

export function ChipRow({ resetKey, label, className, children }: ChipRowProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || el.scrollLeft === 0) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: 0, behavior: reduced ? "auto" : "smooth" });
  }, [resetKey]);

  return (
    <div ref={ref} role="group" aria-label={label} className={cn(CHIP_SCROLLER, className)}>
      {children}
    </div>
  );
}
