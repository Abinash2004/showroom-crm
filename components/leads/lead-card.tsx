import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/format";
import type { LeadDTO } from "@/lib/types";

export function LeadCard({ lead, className }: { lead: LeadDTO; className?: string }) {
  return (
    <li className={className}>
      <Link
        href={`/leads/${lead.id}`}
        className="press block min-h-12 rounded-card bg-surface p-4 shadow-card"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 truncate text-base font-semibold">{lead.customerName}</h2>
          <StatusBadge status={lead.status} />
        </div>
        <p className="mt-1 text-sm text-muted">{lead.customerPhone}</p>
        {lead.vehicleDetails ? <p className="mt-1 line-clamp-1 text-sm">{lead.vehicleDetails}</p> : null}
        <p className="mt-2 text-xs text-muted">
          {lead.branchName} &middot; Visited {formatDate(lead.visitDate)}
        </p>
      </Link>
    </li>
  );
}