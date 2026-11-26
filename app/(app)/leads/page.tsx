import type { Metadata } from "next";
import { AppBar } from "@/components/layout/app-bar";
import { PageBody } from "@/components/layout/page";
import { BranchSwitcher } from "@/components/leads/branch-switcher";
import { ChipLink } from "@/components/leads/chip-link";
import { ChipRow } from "@/components/leads/chip-row";
import { LeadList } from "@/components/leads/lead-list";
import { StickyHeader } from "@/components/leads/sticky-header";
import { DateRangeSheet } from "@/components/leads/date-range-sheet";
import { LeadSearch } from "@/components/leads/lead-search";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { CloseIcon } from "@/components/icons";
import { requireActor } from "@/lib/auth/session";
import { canAccessBranch } from "@/lib/db/helpers";
import { listBranches } from "@/lib/db/repositories/branches";
import { leadStatusCounts, listLeads } from "@/lib/db/repositories/leads";
import { LEAD_STATUSES } from "@/lib/constants";
import { todayInputDate } from "@/lib/format";
import { CHIP_ITEM, CHIP_LIST, CHIP_SCROLLER } from "@/lib/chip-classes";
import { datePresets, matchPreset } from "@/lib/lead-filters";
import type { DatePreset } from "@/lib/lead-filters";
import { buildHref } from "@/lib/url";
import { leadFilterSchema } from "@/lib/validators/entities";

export const metadata: Metadata = { title: "Leads" };
export const runtime = "nodejs";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await requireActor();
  const parsed = leadFilterSchema.parse(await searchParams);
  const filters = parsed.branchId && !canAccessBranch(actor, parsed.branchId) ? { ...parsed, branchId: undefined } : parsed;

  const [result, counts, branches] = await Promise.all([
    listLeads(actor, filters),
    leadStatusCounts(actor, filters),
    listBranches(actor),
  ]);

  const base = {
    q: filters.q,
    status: filters.status,
    branchId: filters.branchId,
    from: filters.from,
    to: filters.to,
  };
  const href = (over: Partial<typeof base>) => buildHref("/leads", { ...base, ...over });

  const today = todayInputDate();
  const presets = datePresets(today);
  const activePreset = matchPreset(presets, filters.from, filters.to);
  const customActive = Boolean((filters.from || filters.to) && !activePreset);
  // Branch is a scope (shown in its chip), not a refinement: the empty-state reset keeps it.
  const clearHref = buildHref("/leads", { status: filters.status, branchId: filters.branchId });
  const anyFilter = Boolean(filters.q || filters.from || filters.to);
  const renderPreset = (p: DatePreset) => {
    const active = activePreset?.id === p.id;
    return (
      <li key={p.id} className={CHIP_ITEM}>
        <ChipLink
          href={active ? href({ from: undefined, to: undefined }) : href({ from: p.from, to: p.to })}
          active={active}
          label={active ? `${p.label}, active. Tap to remove` : `Visited ${p.label.toLowerCase()}`}
        >
          {p.label}
          {active ? <CloseIcon width={14} height={14} /> : null}
        </ChipLink>
      </li>
    );
  };

  const dateSheet = (
    <li className={CHIP_ITEM}>
      <DateRangeSheet
        base={{ q: filters.q, status: filters.status, branchId: filters.branchId }}
        from={filters.from}
        to={filters.to}
        today={today}
        active={customActive}
      />
    </li>
  );
  const allCount = LEAD_STATUSES.reduce((sum, s) => sum + counts[s], 0);
  // Rows sit 10px apart, matching the 10px gap between chips. Each chip row keeps 4px vertical padding so press
  // scale and focus rings aren't clipped by the scroll container; margins top it up to 10px.
  const filtersSection = (
    <section aria-label="Find leads">
      <div className="flex items-center gap-2.5">
        <LeadSearch
          query={filters.q ?? ""}
          base={{ status: filters.status, branchId: filters.branchId, from: filters.from, to: filters.to }}
        />
        {branches.length > 1 ? (
          // Capped at 45% so the search box keeps room to type; long names truncate.
          <div className="min-w-0 max-w-[45%]">
            <BranchSwitcher
              branches={branches.map((b) => ({ id: b.id, name: b.name, location: b.location, isActive: b.isActive }))}
              selectedId={filters.branchId}
              base={{ q: filters.q, status: filters.status, from: filters.from, to: filters.to }}
              className="max-w-full"
            />
          </div>
        ) : null}
      </div>

      <nav aria-label="Filter by status" className={`${CHIP_SCROLLER} mt-1.5`}>
        <ul className={CHIP_LIST}>
          {[undefined, ...LEAD_STATUSES].map((s) => (
            <li key={s ?? "all"} className={CHIP_ITEM}>
              <ChipLink href={href({ status: s })} active={filters.status === s} tone="solid">
                {s ?? "All"}
                <span className="tabular-nums opacity-70">{s ? counts[s] : allCount}</span>
              </ChipLink>
            </li>
          ))}
        </ul>
      </nav>

      <ChipRow label="Quick filters" className="mt-0.5" resetKey={`${filters.branchId ?? ""}|${filters.from ?? ""}|${filters.to ?? ""}`}>
        <ul className={CHIP_LIST}>
          {/* "Pick dates" leads by default (most used); a selected preset moves in front of it so it stays in view. */}
          {activePreset ? renderPreset(activePreset) : null}
          {dateSheet}
          {presets.map((p) => (p.id === activePreset?.id ? null : renderPreset(p)))}
        </ul>
      </ChipRow>
    </section>
  );

  return (
    <>
      <AppBar title="Leads" />
      <PageBody className="space-y-3">


        {result.items.length === 0 ? (
          <StickyHeader>
            {filtersSection}
            <p className="mt-3 text-sm text-muted" aria-live="polite">
              No leads{filters.q ? ` for "${filters.q}"` : ""}
            </p>
          </StickyHeader>
        ) : null}

        {result.items.length === 0 ? (
          <EmptyState title={anyFilter ? "No leads match" : "No leads yet"}>
            {anyFilter ? (
              <LinkButton href={clearHref} variant="tonal" replace className="mt-2">
                Clear search and filters
              </LinkButton>
            ) : (
              "Create a lead when a customer visits."
            )}
          </EmptyState>
        ) : (
          <LeadList
            initial={result}
            params={base}
            query={filters.q}
            header={filtersSection}
            pagination={
              <Pagination
                page={result.page}
                pageSize={result.pageSize}
                total={result.total}
                hrefFor={(page) => buildHref("/leads", { ...base, page: page > 1 ? page : undefined })}
              />
            }
          />
        )}
      </PageBody>
    </>
  );
}
