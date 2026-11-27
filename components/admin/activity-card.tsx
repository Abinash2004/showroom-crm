import { CalendarIcon, UserIcon } from "@/components/icons";
import { ACTION_LABEL, ENTITY_LABEL, fieldLabel, formatValue, isShownField } from "@/lib/activity-labels";
import { cn } from "@/lib/cn";
import type { ActivityAction } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { ActivityDTO } from "@/lib/types";
import { describeIp } from "@/lib/user-agent";

/** Action capsule in the status-tag style: green created, blue updated, red deleted. */
const ACTION_TONE: Record<ActivityAction, string> = {
  create: "bg-status-purchased/12 text-status-purchased",
  update: "bg-status-booked/12 text-status-booked",
  delete: "bg-status-rejected/12 text-status-rejected",
};

/**
 * Activity entry, same layout as the other list cards:
 *   1. what record (subject, with its type) + action tag,
 *   2. what changed, in the app's own field names and values,
 *   3. who, from where and when.
 */
export function ActivityCard({ entry, branchNames }: { entry: ActivityDTO; branchNames: ReadonlyMap<string, string> }) {
  const created = entry.action === "create";
  const rows = Object.entries(entry.changes)
    .filter(([field]) => isShownField(entry.entity, field))
    .map(([field, c]) => ({
      field,
      label: fieldLabel(entry.entity, field),
      from: formatValue(entry.entity, field, c.from, branchNames),
      to: formatValue(entry.entity, field, c.to, branchNames),
    }))
    // A new record has no "before"; only list the values it was created with.
    .filter((r) => !created || r.to !== null);

  return (
    <article className="flex h-full flex-col rounded-[22px] bg-surface-2 p-4">
      {/* 1. Subject + action */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted">{ENTITY_LABEL[entry.entity]}</p>
          <h2 className="line-clamp-1 text-[1.0625rem] font-semibold leading-snug [overflow-wrap:anywhere]">{entry.subject}</h2>
        </div>
        <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold leading-4", ACTION_TONE[entry.action])}>
          {ACTION_LABEL[entry.action]}
        </span>
      </div>

      {/* 2. Changes */}
      {rows.length > 0 ? (
        <dl className="mt-3 space-y-2 rounded-2xl bg-surface p-3 text-sm">
          {rows.map((r) => (
            <div key={r.field} className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] gap-3">
              <dt className="truncate text-xs font-semibold leading-5 text-muted">{r.label}</dt>
              <dd className="min-w-0 leading-5 [overflow-wrap:anywhere]">
                {created ? (
                  <span className="line-clamp-3 font-medium">{r.to}</span>
                ) : (
                  <span className="line-clamp-3">
                    <span className="text-muted line-through decoration-muted/50">{r.from ?? "Not set"}</span>
                    <span aria-label="changed to" className="px-1.5 text-muted">
                      &rarr;
                    </span>
                    <span className="font-semibold">{r.to ?? "Not set"}</span>
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {/* 3. Who, where, when */}
      <p className="mt-auto flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-xs text-muted">
        <span className="inline-flex min-w-0 items-center gap-1">
          <UserIcon aria-hidden="true" width={13} height={13} className="shrink-0" />
          <span className="truncate font-semibold text-fg">{entry.actionByName}</span>
        </span>
        <span className="truncate">{describeIp(entry.actionIP)}</span>
        <span className="inline-flex items-center gap-1 tabular-nums">
          <CalendarIcon aria-hidden="true" width={13} height={13} className="shrink-0" />
          {formatDateTime(entry.createdAt)}
        </span>
      </p>
    </article>
  );
}
