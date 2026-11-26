import type { LeadStatus } from "@/lib/constants";
import { cn } from "@/lib/cn";

/** Tonal colour pair per lead status (background + readable text, AA contrast in both themes). */
export const STATUS_TONE: Record<LeadStatus, string> = {
  Opened: "bg-info-soft text-on-info-soft",
  Booked: "bg-warn-soft text-on-warn-soft",
  Rejected: "bg-danger-soft text-on-danger-soft",
  Purchased: "bg-success-soft text-on-success-soft",
};

export function StatusBadge({ status, size = "md", className }: { status: LeadStatus; size?: "sm" | "md"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold",
        size === "sm" ? "px-2 py-0.5 text-[11px] leading-4" : "px-3 py-1 text-xs",
        STATUS_TONE[status],
        className,
      )}
    >
      {status}
    </span>
  );
}

export function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "success" | "danger" | "info" }) {
  const tones = {
    neutral: "bg-neutral-soft text-on-neutral-soft",
    success: "bg-success-soft text-on-success-soft",
    danger: "bg-danger-soft text-on-danger-soft",
    info: "bg-info-soft text-on-info-soft",
  } as const;
  return <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", tones[tone])}>{children}</span>;
}