import type { Metadata } from "next";
import { ActivityCard } from "@/components/admin/activity-card";
import { AppBar } from "@/components/layout/app-bar";
import { PageBody } from "@/components/layout/page";
import { ChipLink } from "@/components/leads/chip-link";
import { ChipRow } from "@/components/leads/chip-row";
import { DateRangeSheet } from "@/components/leads/date-range-sheet";
import { StickyHeader } from "@/components/leads/sticky-header";
import { EmptyState } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { CloseIcon } from "@/components/icons";
import { requireAdminPage } from "@/lib/auth/session";
import { activityEntityCounts, listActivity } from "@/lib/db/activity";
import { listBranches } from "@/lib/db/repositories/branches";
import { CHIP_ITEM, CHIP_LIST, CHIP_SCROLLER } from "@/lib/chip-classes";
import { ACTIVITY_ENTITIES } from "@/lib/constants";
import type { ActivityEntity } from "@/lib/constants";
import { todayInputDate } from "@/lib/format";
import { datePresets, matchPreset } from "@/lib/lead-filters";
import type { DatePreset } from "@/lib/lead-filters";
import { buildHref } from "@/lib/url";
import { activityFilterSchema } from "@/lib/validators/entities";

export const metadata: Metadata = { title: "Activity log" };
export const runtime = "nodejs";

const PATH = "/admin/activity";
const ENTITY_LABELS: Record<ActivityEntity, string> = {
  branch: "Branches",
  user: "Users",
  lead: "Leads",
  interaction: "Interactions",
};

export default async function ActivityPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await requireAdminPage();
  const filters = activityFilterSchema.parse(await searchParams);
  const [result, counts, branches] = await Promise.all([
    listActivity(actor, filters),
    activityEntityCounts(actor, filters),
    listBranches(actor),
  ]);
  // Branch ids inside lead/user changes are shown by name (O(1) lookups).
  const branchNames = new Map(branches.map((b) => [b.id, b.name]));

  const base = { entity: filters.entity, from: filters.from, to: filters.to };
  const href = (over: Partial<typeof base>) => buildHref(PATH, { ...base, ...over });
  const allCount = ACTIVITY_ENTITIES.reduce((sum, e) => sum + counts[e], 0);

  const today = todayInputDate();
  const presets = datePresets(today);
  const activePreset = matchPreset(presets, filters.from, filters.to);
  const customActive = Boolean((filters.from || filters.to) && !activePreset);

  const renderPreset = (p: DatePreset) => {
    const active = activePreset?.id === p.id;
    return (
      <li key={p.id} className={CHIP_ITEM}>
        <ChipLink
          href={active ? href({ from: undefined, to: undefined }) : href({ from: p.from, to: p.to })}
          active={active}
          label={active ? `${p.label}, active. Tap to remove` : `Changes ${p.label.toLowerCase()}`}
        >
          {p.label}
          {active ? <CloseIcon width={14} height={14} className="chip-accent" /> : null}
        </ChipLink>
      </li>
    );
  };

  const first = (result.page - 1) * result.pageSize + 1;
  const last = first + result.items.length - 1;

  return (
    <>
      <AppBar title="Activity log" backHref="/admin" parent="Admin" />
      <PageBody wide className="space-y-3">
        <StickyHeader>
          <section aria-label="Filter activity">
            <nav aria-label="Filter by type" className={CHIP_SCROLLER}>
              <ul className={CHIP_LIST}>
                {[undefined, ...ACTIVITY_ENTITIES].map((e) => (
                  <li key={e ?? "all"} className={CHIP_ITEM}>
                    <ChipLink href={href({ entity: e })} active={filters.entity === e} tone="solid">
                      {e ? ENTITY_LABELS[e] : "All"}
                      <span className="chip-accent tabular-nums opacity-70">{e ? counts[e] : allCount}</span>
                    </ChipLink>
                  </li>
                ))}
              </ul>
            </nav>
            <ChipRow label="Date" className="mt-0.5" resetKey={`${filters.from ?? ""}|${filters.to ?? ""}`}>
              <ul className={CHIP_LIST}>
                {activePreset ? renderPreset(activePreset) : null}
                <li className={CHIP_ITEM}>
                  <DateRangeSheet
                    base={{ entity: filters.entity }}
                    from={filters.from}
                    to={filters.to}
                    today={today}
                    active={customActive}
                    path={PATH}
                    title="Change date"
                  />
                </li>
                {presets.map((p) => (p.id === activePreset?.id ? null : renderPreset(p)))}
              </ul>
            </ChipRow>
          </section>
          <p className="mt-3 text-sm tabular-nums text-muted" aria-live="polite">
            {result.total === 0 ? "No changes" : `${first}-${last} of ${result.total} ${result.total === 1 ? "change" : "changes"}`}
          </p>
        </StickyHeader>

        {result.items.length === 0 ? (
          <EmptyState title="No activity found">Try another type or date.</EmptyState>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {result.items.map((a) => (
              <li key={a.id} className="min-w-0">
                <ActivityCard entry={a} branchNames={branchNames} />
              </li>
            ))}
          </ul>
        )}
        <Pagination
          page={result.page}
          pageSize={result.pageSize}
          total={result.total}
          hrefFor={(p) => buildHref(PATH, { ...base, page: p > 1 ? p : undefined })}
        />
      </PageBody>
    </>
  );
}
