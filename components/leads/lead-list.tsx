"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadLeadsPageAction } from "@/lib/actions/lead-list";
import { Skeleton } from "@/components/ui/card";
import type { LeadDTO, Page } from "@/lib/types";
import { LeadCard } from "./lead-card";
import { StickyHeader } from "./sticky-header";

interface LeadListProps {
  /** First page, rendered on the server. */
  initial: Page<LeadDTO>;
  /** Active filters (q, status, branchId, from, to), sent back when loading more. */
  params: Record<string, string | undefined>;
  query?: string;
  /** Search and filter chips, pinned together with the result count. */
  header: React.ReactNode;
  /** Previous/Next links, shown from 768px up. */
  pagination: React.ReactNode;
}

type LoadState = "idle" | "loading" | "error";

/**
 * Phones: infinite scroll, 10 leads at a time, triggered when the end of the list comes near.
 * Tablet/desktop: the server-rendered page plus Previous/Next links.
 */
export function LeadList({ initial, params, query, header, pagination }: LeadListProps) {
  const [items, setItems] = useState(initial.items);
  const [page, setPage] = useState(initial.page);
  const [total, setTotal] = useState(initial.total);
  const [state, setState] = useState<LoadState>("idle");
  const [source, setSource] = useState(initial);
  const sentinel = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  // New server data (filter change, refresh button): start over from it.
  if (initial !== source) {
    setSource(initial);
    setItems(initial.items);
    setPage(initial.page);
    setTotal(initial.total);
    setState("idle");
  }

  const pages = Math.max(1, Math.ceil(total / initial.pageSize));
  const hasMore = page < pages;

  const loadMore = useCallback(async () => {
    if (busy.current || !hasMore) return;
    busy.current = true;
    setState("loading");
    const result = await loadLeadsPageAction(params, page + 1);
    busy.current = false;
    if (!result.ok) {
      setState("error");
      return;
    }
    setItems((prev) => {
      // Leads created while scrolling shift the offsets; drop repeats by id (O(n) with a Set).
      const seen = new Set(prev.map((l) => l.id));
      return [...prev, ...result.data.items.filter((l) => !seen.has(l.id))];
    });
    setPage(result.data.page);
    setTotal(result.data.total);
    setState("idle");
  }, [hasMore, page, params]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || state === "error") return;
    // The sentinel is display:none from 768px up, so it never intersects there.
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) void loadMore();
    }, { rootMargin: "0px 0px 600px 0px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore, state]);

  const first = (initial.page - 1) * initial.pageSize + 1;
  const last = first + initial.items.length - 1;
  const noun = total === 1 ? "lead" : "leads";
  const suffix = query ? ` for "${query}"` : "";

  return (
    <>
      <StickyHeader>
        {header}
        <p className="mt-3 text-sm text-muted" aria-live="polite">
          {total === 0 ? (
            "No leads"
          ) : (
            <>
              <span className="md:hidden">{`${items.length} of ${total} ${noun}`}</span>
              <span className="max-md:hidden">{`${first}-${last} of ${total} ${noun}`}</span>
            </>
          )}
          {suffix}
        </p>
      </StickyHeader>

      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* From 768px up only the server page is shown, so a resize never mixes pages with the links. */}
        {items.map((lead, i) => (
          <LeadCard key={lead.id} lead={lead} className={i < initial.items.length ? undefined : "md:hidden"} />
        ))}
      </ul>

      <div className="md:hidden">
        {hasMore ? (
          <div ref={sentinel} className="space-y-3" aria-busy={state === "loading"}>
            {state === "error" ? (
              <div role="alert" className="flex items-center justify-between gap-3 rounded-[22px] bg-danger-soft p-4 text-sm font-medium text-on-danger-soft">
                Couldn&apos;t load more leads.
                <button type="button" onClick={() => void loadMore()} className="press min-h-12 rounded-xl bg-surface px-4 font-semibold text-fg">
                  Retry
                </button>
              </div>
            ) : (
              <>
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                {/* Keyboard and screen-reader fallback for the automatic loading. */}
                <button type="button" onClick={() => void loadMore()} className="sr-only focus:not-sr-only focus:block focus:w-full focus:rounded-xl focus:p-3 focus:text-center">
                  Load more leads
                </button>
              </>
            )}
          </div>
        ) : total > initial.pageSize ? (
          <p className="py-4 text-center text-sm text-muted">You&apos;ve seen all {total} leads</p>
        ) : null}
      </div>

      <div className="max-md:hidden">{pagination}</div>
    </>
  );
}
