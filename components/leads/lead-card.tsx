import Link from "next/link";
import { CalendarIcon, PhoneIcon, PinIcon, StoreIcon } from "@/components/icons";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatPhone } from "@/lib/format";
import type { LeadDTO } from "@/lib/types";

/**
 * Lead tile, scanned top to bottom in order of importance:
 *   1. who (name) and where they stand (status),
 *   2. what they want (vehicle),
 *   3. how to reach them (phone + one-tap call),
 *   4. context (branch, area, visit date).
 * The whole card opens the lead; the call button sits above the stretched link (content ignores
 * pointer events), so there is no interactive element nested inside another.
 */
export function LeadCard({ lead, className }: { lead: LeadDTO; className?: string }) {
  const phone = formatPhone(lead.customerPhone);
  const visited = formatDate(lead.visitDate);

  return (
    <li className={className}>
      <div className="relative h-full rounded-[22px] bg-surface-2 transition-colors hover:bg-surface-2-hover">
        <Link href={`/leads/${lead.id}`} className="press absolute inset-0 rounded-[22px]">
          <span className="sr-only">
            Open lead {lead.customerName}, {lead.status}
          </span>
        </Link>

        <div className="pointer-events-none relative flex h-full flex-col p-4">
          {/* 1. Name + status */}
          <div className="flex items-center justify-between gap-3">
            <h2 className="line-clamp-1 min-w-0 text-[17px] font-semibold leading-snug [overflow-wrap:anywhere]">{lead.customerName}</h2>
            <StatusBadge status={lead.status} className="shrink-0" />
          </div>

          {/* 2. Vehicle interest */}
          <p className="mt-1 line-clamp-1 text-sm [overflow-wrap:anywhere]">
            {lead.vehicleDetails ? (
              <span className="text-fg/80">{lead.vehicleDetails}</span>
            ) : (
              <span className="text-muted">No vehicle noted</span>
            )}
          </p>

          {/* 3 + 4. Contact and context, with the call action */}
          <div className="mt-auto flex items-end justify-between gap-3 pt-4">
            <div className="min-w-0 space-y-1.5">
              <p className="flex items-center gap-1.5 text-[15px] font-semibold tabular-nums tracking-wide">
                <PhoneIcon aria-hidden="true" width={15} height={15} className="shrink-0 text-muted" />
                {phone}
              </p>
              <p className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                <span className="inline-flex min-w-0 items-center gap-1">
                  <StoreIcon aria-hidden="true" width={13} height={13} className="shrink-0" />
                  <span className="truncate">{lead.branchName}</span>
                </span>
                {lead.customerLocation ? (
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <PinIcon aria-hidden="true" width={13} height={13} className="shrink-0" />
                    <span className="truncate">{lead.customerLocation}</span>
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <CalendarIcon aria-hidden="true" width={13} height={13} className="shrink-0" />
                  {visited}
                </span>
              </p>
            </div>
            <a
              href={`tel:${lead.customerPhone}`}
              aria-label={`Call ${lead.customerName} on ${phone}`}
              className="press pointer-events-auto inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-white hover:bg-ink/90"
            >
              <PhoneIcon width={18} height={18} />
            </a>
          </div>
        </div>
      </div>
    </li>
  );
}
