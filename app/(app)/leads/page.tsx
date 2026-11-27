import type { Metadata } from "next";
import { AppBar } from "@/components/layout/app-bar";
import { PageBody } from "@/components/layout/page";
import { BranchSwitcher } from "@/components/leads/branch-switcher";
import { ChipLink } from "@/components/leads/chip-link";
import { ChipRow } from "@/components/leads/chip-row";
import { InteractionDial } from "@/components/leads/interaction-dial";
import { LeadList } from "@/components/leads/lead-list";
import { StickyHeader } from "@/components/leads/sticky-header";
import { DateRangeSheet } from "@/components/leads/date-range-sheet";
import { LeadSearch } from "@/components/leads/lead-search";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { CloseIcon } from "@/components/icons";
import { requireActor } from "@/lib/auth/session";
import { rememberedBranchId } from "@/lib/branch-preference-server";
import { listBranches } from "@/lib/db/repositories/branches";
import { leadStatusCounts, listLeads } from "@/lib/db/repositories/leads";
import { LEAD_STATUSES } from "@/lib/constants";
import { todayInputDate } from "@/lib/format";
import { CHIP_ITEM, CHIP_LIST, CHIP_SCROLLER } from "@/lib/chip-classes";
import { datePresets, matchPreset, resolveBranchId } from "@/lib/lead-filters";
import type { DatePreset } from "@/lib/lead-filters";
import { buildHref } from "@/lib/url";
import { leadFilterSchema } from "@/lib/validators/entities";

export const metadata: Metadata = { title: "Leads" };
export const runtime = "nodejs";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await requireActor();
  const query = await searchParams;
  const parsed = leadFilterSchema.parse(query);
  // Always exactly one branch: the link's, else the one remembered from the last pick (shared with Follow-ups),
  // else the first active branch. Each is used only if the user may see it.
  const [branches, remembered] = await Promise.all([listBranches(actor), rememberedBranchId()]);
  // Status defaults to Opened (the leads that need work); "All" is the explicit `status=all`, which the schema reads as no filter.
  const status = query.status === "all" ? undefined : (parsed.status ?? "Opened");
  const filters = { ...parsed, status, branchId: resolveBranchId(branches, parsed.branchId, remembered) };
  // What goes in links: always explicit, so a refinement (search, dates, branch) never flips Opened back and forth.
  const statusKey = filters.status ?? "all";

  const [result, counts] = await Promise.all([listLeads(actor, filters), leadStatusCounts(actor, filters)]);

  const base = {
    q: filters.q,
    status: statusKey,
    interactions: filters.interactions,
    branchId: filters.branchId,
    from: filters.from,
    to: filters.to,
  };
  const href = (over: Partial<typeof base>) => buildHref("/leads", { ...base, ...over });

  const today = todayInputDate();
  const presets = datePresets(today);
  const activePreset = matchPreset(presets, filters.from, filters.to);
  const customActive = Boolean((filters.from || filters.to) && !activePreset);
  // Branch is the scope (shown in its chip), not a refinement: the empty-state reset keeps it.
  const clearHref = buildHref("/leads", { status: statusKey, branchId: filters.branchId });
  const anyFilter = Boolean(filters.q || filters.from || filters.to || filters.interactions);
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
          {active ? <CloseIcon width={14} height={14} className="chip-accent" /> : null}
        </ChipLink>
      </li>
    );
  };

  const dateSheet = (
    <li className={CHIP_ITEM}>
      <DateRangeSheet
        base={{ q: filters.q, status: statusKey, interactions: filters.interactions, branchId: filters.branchId }}
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
  // Keyed: built on the server and rendered inside the client list's sticky header next to the client's own
  // children, where React needs a key on an element it didn't create itself.
  const filtersSection = (
    <section key="filters" aria-label="Find leads">
      {/* Search and branch share one row: the branch chip is only as wide as its text (capped at 45%), search takes the rest. */}
      <div className="flex items-center gap-2.5">
        <LeadSearch
          query={filters.q ?? ""}
          base={{ status: statusKey, interactions: filters.interactions, branchId: filters.branchId, from: filters.from, to: filters.to }}
        />
        {branches.length > 1 ? (
          // Capped at 45% so the search box keeps room to type; long names truncate.
          <div className="min-w-0 max-w-[45%] shrink-0">
            <BranchSwitcher
              branches={branches.map((b) => ({ id: b.id, name: b.name, location: b.location, isActive: b.isActive }))}
              selectedId={filters.branchId}
              base={{ q: filters.q, status: statusKey, interactions: filters.interactions, from: filters.from, to: filters.to }}
              className="max-w-full"
            />
          </div>
        ) : null}
      </div>

      <nav aria-label="Filter by status" className={`${CHIP_SCROLLER} mt-1.5`}>
        <ul className={CHIP_LIST}>
          {/* Opened first (the default view), "All" last. */}
          {[...LEAD_STATUSES, undefined].map((s) => (
            <li key={s ?? "all"} className={CHIP_ITEM}>
              <ChipLink href={href({ status: s ?? "all" })} active={filters.status === s} tone="solid">
                {s ?? "All"}
                <span className="chip-accent tabular-nums opacity-70">{s ? counts[s] : allCount}</span>
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

  // Interaction count dial, at the right of the "1-10 of 16 leads" row.
  const interactionFilter = <InteractionDial value={filters.interactions} base={{ ...base, interactions: undefined }} />;

  return (
    <>
      <AppBar title="Leads" />
      <PageBody wide className="space-y-3">


        {result.items.length === 0 ? (
          <StickyHeader>
            {filtersSection}
            <div className="mt-2 flex min-h-12 items-center justify-between gap-3">
              <p className="min-w-0 truncate text-sm text-muted" aria-live="polite">
                No leads{filters.q ? ` for "${filters.q}"` : ""}
              </p>
              {interactionFilter}
            </div>
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
            countAside={interactionFilter}
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
