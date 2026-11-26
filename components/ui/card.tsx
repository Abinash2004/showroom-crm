import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Warm Pebble tile: borderless, contrast from the surface tone alone. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[22px] bg-surface-2 p-4", className)} {...props} />;
}

/** Warm Porcelain sheet for forms and detail panels. */
export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[28px] bg-surface p-5 shadow-sheet sm:p-6", className)} {...props} />;
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-[22px] bg-surface-2 px-6 py-10 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      {children ? <div className="mt-2 text-sm text-muted">{children}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("skeleton", className)} />;
}
