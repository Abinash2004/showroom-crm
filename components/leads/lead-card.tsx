import Link from "next/link";
import { CalendarIcon, ChatIcon, PhoneIcon, TwoWheelerIcon } from "@/components/icons";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCardStamp, formatPhone } from "@/lib/format";
import type { LeadListItem } from "@/lib/types";
import { NamePhone } from "./name-phone";

/**
 * Lead tile, scanned top to bottom in order of importance:
 *   1. who (name | phone) and where they stand (status),
 *   2. what they want (vehicle) and context (visit date and time, number of interactions),
 *      with the one-tap call beside them.
 * The whole card opens the lead; the call button sits above the stretched link (content ignores
 * pointer events), so there is no interactive element nested inside another.
 */
export function LeadCard({ lead, className }: { lead: LeadListItem; className?: string }) {
  const phone = formatPhone(lead.customerPhone);

  return (
    <li className={className}>
      <div className="relative h-full rounded-[22px] bg-surface-2 transition-colors hover:bg-surface-2-hover">
        <Link href={`/leads/${lead.id}`} className="press absolute inset-0 rounded-[22px]">
          <span className="sr-only">
            Open lead {lead.customerName}, {lead.status}
          </span>
        </Link>

        <div className="pointer-events-none relative flex h-full flex-col p-4">
          <div className="flex items-start justify-between gap-3">
            <NamePhone name={lead.customerName} phone={lead.customerPhone} />
            <StatusBadge status={lead.status} className="shrink-0" />
          </div>

          <div className="mt-2.5 flex flex-1 items-end justify-between gap-3">
            <div className="min-w-0 space-y-3">
              <p className="flex min-w-0 items-center gap-1.5 text-sm">
                <TwoWheelerIcon aria-hidden="true" width={16} height={16} className="shrink-0 text-muted" />
                {lead.vehicleDetails ? (
                  <span className="truncate text-fg/80">{lead.vehicleDetails}</span>
                ) : (
                  <span className="truncate text-muted">No vehicle noted</span>
                )}
              </p>
              <p className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <CalendarIcon aria-hidden="true" width={13} height={13} className="shrink-0" />
                  {formatCardStamp(lead.visitDate)}
                </span>
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <ChatIcon aria-hidden="true" width={13} height={13} className="shrink-0" />
                  {lead.interactionCount}
                  <span className="sr-only">{lead.interactionCount === 1 ? " interaction" : " interactions"}</span>
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
