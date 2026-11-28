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

/** Values longer than this take the full width of the created grid instead of half. */
const WIDE_VALUE = 24;

/**
 * Activity entry, same layout as the other list cards:
 *   1. which record (type, subject) + action tag,
 *   2. what changed: a compact grid for a new record, label above `old -> new` for an update,
 *   3. who (name, IP) and when.
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
      {/* 1. Record + action */}
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
        created ? (
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-2xl bg-surface p-3">
            {rows.map((r) => (
              <div key={r.field} className={cn("min-w-0", (r.to?.length ?? 0) > WIDE_VALUE && "col-span-2")}>
                <dt className="text-xs font-semibold leading-4 text-muted">{r.label}</dt>
                <dd className="line-clamp-3 text-sm font-medium leading-5 [overflow-wrap:anywhere]">{r.to}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <dl className="mt-3 divide-y divide-line rounded-2xl bg-surface px-3">
            {rows.map((r) => (
              <div key={r.field} className="min-w-0 py-2.5">
                <dt className="text-xs font-semibold leading-4 text-muted">{r.label}</dt>
                <dd className="line-clamp-4 text-sm leading-5 [overflow-wrap:anywhere]">
                  <span className="text-muted line-through decoration-muted/50">{r.from ?? "Not set"}</span>
                  <span aria-label="changed to" className="px-1.5 text-muted">
                    &rarr;
                  </span>
                  <span className="font-semibold">{r.to ?? "Not set"}</span>
                </dd>
              </div>
            ))}
          </dl>
        )
      ) : null}

      {/* 3. Who, from where, when */}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 pt-3 text-xs text-muted">
        <span className="flex min-w-0 items-center gap-1.5">
          <UserIcon aria-hidden="true" width={13} height={13} className="shrink-0" />
          <span className="truncate font-semibold text-fg">{entry.actionByName}</span>
          <span className="shrink-0 tabular-nums">{describeIp(entry.actionIP)}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 tabular-nums">
          <CalendarIcon aria-hidden="true" width={13} height={13} className="shrink-0" />
          {formatDateTime(entry.createdAt)}
        </span>
      </div>
    </article>
  );
}
