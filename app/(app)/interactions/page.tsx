import type { Metadata } from "next";
import { AppBar } from "@/components/layout/app-bar";
import { PageBody } from "@/components/layout/page";
import { FollowUpList } from "@/components/follow-ups/follow-up-list";
import { BranchSwitcher } from "@/components/leads/branch-switcher";
import { ChipLink } from "@/components/leads/chip-link";
import { ChipRow } from "@/components/leads/chip-row";
import { DateRangeSheet } from "@/components/leads/date-range-sheet";
import { LeadSearch } from "@/components/leads/lead-search";
import { StickyHeader } from "@/components/leads/sticky-header";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { CloseIcon } from "@/components/icons";
import { requireActor } from "@/lib/auth/session";
import { rememberedBranchId } from "@/lib/branch-preference-server";
import { listBranches } from "@/lib/db/repositories/branches";
import { interactionReport } from "@/lib/db/repositories/interactions";
import { todayInputDate } from "@/lib/format";
import { CHIP_ITEM, CHIP_LIST } from "@/lib/chip-classes";
import { datePresets, matchPreset, resolveBranchId } from "@/lib/lead-filters";
import type { DatePreset } from "@/lib/lead-filters";
import { buildHref } from "@/lib/url";
import { interactionFilterSchema } from "@/lib/validators/entities";

export const metadata: Metadata = { title: "Follow-ups" };
export const runtime = "nodejs";

const PATH = "/interactions";

export default async function InteractionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await requireActor();
  const parsed = interactionFilterSchema.parse(await searchParams);
  // Always exactly one branch: the link's, else the one remembered from the last pick (shared with Leads),
  // else the first active branch. Each is used only if the user may see it.
  const [branches, remembered] = await Promise.all([listBranches(actor), rememberedBranchId()]);
  const filters = { ...parsed, branchId: resolveBranchId(branches, parsed.branchId, remembered) };
  const result = await interactionReport(actor, filters);

  const base = { q: filters.q, branchId: filters.branchId, from: filters.from, to: filters.to };
  const href = (over: Partial<typeof base>) => buildHref(PATH, { ...base, ...over });

  const today = todayInputDate();
  const presets = datePresets(today);
  const activePreset = matchPreset(presets, filters.from, filters.to);
  const customActive = Boolean((filters.from || filters.to) && !activePreset);
  // Branch is the scope (shown in its chip), not a refinement: the empty-state reset keeps it.
  const clearHref = buildHref(PATH, { branchId: filters.branchId });
  const anyFilter = Boolean(filters.q || filters.from || filters.to);

  const renderPreset = (p: DatePreset) => {
    const active = activePreset?.id === p.id;
    return (
      <li key={p.id} className={CHIP_ITEM}>
        <ChipLink
          href={active ? href({ from: undefined, to: undefined }) : href({ from: p.from, to: p.to })}
          active={active}
          label={active ? `${p.label}, active. Tap to remove` : `Follow-ups ${p.label.toLowerCase()}`}
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
        base={{ q: filters.q, branchId: filters.branchId }}
        from={filters.from}
        to={filters.to}
        today={today}
        active={customActive}
        path={PATH}
        title="Follow-up date"
      />
    </li>
  );

  // Same spacing as the lead list: rows sit 10px apart, matching the 10px gap between chips.
  // Keyed: built on the server and rendered inside the client list's sticky header next to the client's own
  // children, where React needs a key on an element it didn't create itself.
  const filtersSection = (
    <section key="filters" aria-label="Find follow-ups">
      {/* Search and branch share one row: the branch chip is only as wide as its text (capped at 45%), search takes the rest. */}
      <div className="flex items-center gap-2.5">
        <LeadSearch
          query={filters.q ?? ""}
          base={{ branchId: filters.branchId, from: filters.from, to: filters.to }}
          path={PATH}
          label="Search follow-ups by customer name or phone"
        />
        {branches.length > 1 ? (
          // Capped at 45% so the search box keeps room to type; long names truncate.
          <div className="min-w-0 max-w-[45%] shrink-0">
            <BranchSwitcher
              branches={branches.map((b) => ({ id: b.id, name: b.name, location: b.location, isActive: b.isActive }))}
              selectedId={filters.branchId}
              base={{ q: filters.q, from: filters.from, to: filters.to }}
              path={PATH}
              className="max-w-full"
            />
          </div>
        ) : null}
      </div>

      <ChipRow label="Quick filters" className="mt-1.5" resetKey={`${filters.branchId ?? ""}|${filters.from ?? ""}|${filters.to ?? ""}`}>
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
      <AppBar title="Follow-ups" />
      <PageBody wide className="space-y-3">
        {result.items.length === 0 ? (
          <>
            <StickyHeader>
              {filtersSection}
              <p className="mt-3 text-sm text-muted" aria-live="polite">
                No follow-ups{filters.q ? ` for "${filters.q}"` : ""}
              </p>
            </StickyHeader>
            <EmptyState title={anyFilter ? "No follow-ups match" : "No follow-ups yet"}>
              {anyFilter ? (
                <LinkButton href={clearHref} variant="tonal" replace className="mt-2">
                  Clear search and filters
                </LinkButton>
              ) : (
                "Log a follow-up from a lead after talking to the customer."
              )}
            </EmptyState>
          </>
        ) : (
          <FollowUpList
            initial={result}
            params={base}
            query={filters.q}
            header={filtersSection}
            pagination={
              <Pagination
                page={result.page}
                pageSize={result.pageSize}
                total={result.total}
                hrefFor={(page) => buildHref(PATH, { ...base, page: page > 1 ? page : undefined })}
              />
            }
          />
        )}
      </PageBody>
    </>
  );
}
