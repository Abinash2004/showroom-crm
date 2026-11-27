import Link from "next/link";
import { CalendarIcon, UserIcon } from "@/components/icons";
import { NamePhone } from "@/components/leads/name-phone";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCardStamp, ordinal } from "@/lib/format";
import type { InteractionReportRow } from "@/lib/types";

/**
 * Follow-up tile, same layout as the lead card:
 *   1. who (name | phone) and where the lead stands now (status),
 *   2. what happened (outcome, up to 2 lines) and context (who logged it, date and time),
 *      with "2nd of 3" beside them.
 * The whole card is one link to the lead.
 */
export function FollowUpCard({ item, className }: { item: InteractionReportRow; className?: string }) {
  return (
    <li className={className}>
      <Link
        href={`/leads/${item.leadId}`}
        className="press flex h-full min-h-12 flex-col rounded-[22px] bg-surface-2 p-4 transition-colors hover:bg-surface-2-hover"
      >
        <div className="flex items-start justify-between gap-3">
          <NamePhone name={item.customerName} phone={item.customerPhone} />
          <StatusBadge status={item.leadStatus} className="shrink-0" />
        </div>

        {/* Outcome at the top, details at the bottom: cards in a desktop row share a height, and the gap goes between. */}
        <div className="mt-2.5 flex flex-1 justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <p className="line-clamp-2 whitespace-pre-line text-sm leading-relaxed text-fg/80 [overflow-wrap:anywhere]">{item.outcome}</p>
            <p className="mt-auto flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-xs text-muted">
              <span className="inline-flex min-w-0 items-center gap-1">
                <UserIcon aria-hidden="true" width={13} height={13} className="shrink-0" />
                <span className="truncate">{item.actionByName}</span>
              </span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <CalendarIcon aria-hidden="true" width={13} height={13} className="shrink-0" />
                {formatCardStamp(item.date)}
              </span>
            </p>
          </div>
          {/* Which follow-up this is for the lead, in the selected-chip style. */}
          <span className="inline-flex h-9 shrink-0 items-center gap-1 self-end rounded-full bg-ink px-3.5 text-xs font-semibold leading-4 tabular-nums text-white">
            <span className="text-[var(--accent-on-ink)]">{ordinal(item.sequence)}</span>
            <span className="font-medium text-zinc-300">of {item.sequenceTotal}</span>
            <span className="sr-only"> follow-ups for this lead</span>
          </span>
        </div>
      </Link>
    </li>
  );
}
