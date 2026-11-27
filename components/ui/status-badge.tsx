import type { LeadStatus } from "@/lib/constants";
import { DotIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

/** Per lead status: the status colour as text on a light (12%) tint of the same colour. */
export const STATUS_TONE: Record<LeadStatus, string> = {
  Opened: "text-status-opened bg-status-opened/12",
  Booked: "text-status-booked bg-status-booked/12",
  Rejected: "text-status-rejected bg-status-rejected/12",
  Purchased: "text-status-purchased bg-status-purchased/12",
};

export function StatusBadge({ status, size = "md", className }: { status: LeadStatus; size?: "sm" | "md"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold leading-4",
        size === "sm" ? "px-2 py-0.5 text-[0.6875rem]" : "px-2.5 py-1 text-xs",
        STATUS_TONE[status],
        className,
      )}
    >
      {status}
    </span>
  );
}

type PillTone = "neutral" | "success" | "danger" | "info";

const PILL_TONE: Record<PillTone, string> = {
  neutral: "text-muted",
  success: "text-status-purchased",
  danger: "text-status-rejected",
  info: "text-status-booked",
};

/** Inline status text with a dot (Signed in, Admin, Inactive, ...). Unboxed like lead statuses. */
export function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: PillTone }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold capitalize", PILL_TONE[tone])}>
      <DotIcon aria-hidden="true" width={10} height={10} />
      {children}
    </span>
  );
}
