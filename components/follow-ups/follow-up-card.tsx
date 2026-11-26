import Link from "next/link";
import { formatDate } from "@/lib/format";
import type { InteractionReportRow } from "@/lib/types";

export function FollowUpCard({ item, className }: { item: InteractionReportRow; className?: string }) {
  return (
    <li className={className}>
      <Link href={`/leads/${item.leadId}`} className="press block min-h-12 rounded-card bg-surface p-4 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 truncate text-base font-semibold">{item.customerName}</h2>
          <span className="shrink-0 text-xs text-muted">{formatDate(item.date)}</span>
        </div>
        <p className="mt-1 line-clamp-3 text-sm [overflow-wrap:anywhere]">{item.outcome}</p>
        <p className="mt-2 text-xs text-muted">
          {item.branchName} &middot; {item.actionByName}
        </p>
      </Link>
    </li>
  );
}
