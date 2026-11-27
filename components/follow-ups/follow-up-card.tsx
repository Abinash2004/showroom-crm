import Link from "next/link";
import { CalendarIcon, StoreIcon, UserIcon } from "@/components/icons";
import { formatDate, ordinal } from "@/lib/format";
import type { InteractionReportRow } from "@/lib/types";

/**
 * Follow-up tile, same layout as the lead card:
 *   1. who (customer name) and which branch (name + location),
 *   2. what happened (outcome, up to 3 lines),
 *   3. context (who logged it, date) and which follow-up this is for the lead ("2nd of 3").
 * The whole card is one link to the lead.
 */
export function FollowUpCard({ item, className }: { item: InteractionReportRow; className?: string }) {
  const branch = item.branchLocation ? `${item.branchName} · ${item.branchLocation}` : item.branchName;
  return (
    <li className={className}>
      <Link
        href={`/leads/${item.leadId}`}
        className="press flex h-full min-h-12 flex-col rounded-[22px] bg-surface-2 p-4 transition-colors hover:bg-surface-2-hover"
      >
        {/* 1. Customer + branch tag (same capsule style as the "Opened" status) */}
        <div className="flex items-center justify-between gap-3">
          <h2 className="line-clamp-1 min-w-0 text-[1.0625rem] font-semibold leading-snug [overflow-wrap:anywhere]">{item.customerName}</h2>
          <span
            title={branch}
            className="inline-flex min-w-0 max-w-[55%] shrink-0 items-center gap-1 rounded-full bg-status-opened/12 px-2.5 py-1 text-xs font-semibold leading-4 text-status-opened"
          >
            <StoreIcon aria-hidden="true" width={12} height={12} className="shrink-0" />
            <span className="truncate">{branch}</span>
          </span>
        </div>

        {/* 2. Outcome */}
        <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-fg/80 [overflow-wrap:anywhere]">{item.outcome}</p>

        {/* 3. Context + open */}
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <p className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="inline-flex min-w-0 items-center gap-1">
              <UserIcon aria-hidden="true" width={13} height={13} className="shrink-0" />
              <span className="truncate">{item.actionByName}</span>
            </span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <CalendarIcon aria-hidden="true" width={13} height={13} className="shrink-0" />
              {formatDate(item.date)}
            </span>
          </p>
          {/* Which follow-up this is for the lead, in the selected-chip style. */}
          <span className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-ink px-3.5 text-xs font-semibold leading-4 tabular-nums text-white">
            <span className="text-[var(--accent-on-ink)]">{ordinal(item.sequence)}</span>
            <span className="font-medium text-zinc-300">of {item.sequenceTotal}</span>
            <span className="sr-only"> follow-ups for this lead</span>
          </span>
        </div>
      </Link>
    </li>
  );
}
