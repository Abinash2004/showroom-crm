"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadFollowUpsPageAction } from "@/lib/actions/follow-up-list";
import { Skeleton } from "@/components/ui/card";
import { StickyHeader } from "@/components/leads/sticky-header";
import type { InteractionReportRow, Page } from "@/lib/types";
import { FollowUpCard } from "./follow-up-card";

interface FollowUpListProps {
  /** First page, rendered on the server. */
  initial: Page<InteractionReportRow>;
  /** Active filters (q, branchId, from, to), sent back when loading more. */
  params: Record<string, string | undefined>;
  query?: string;
  /** Search and filter chips, pinned together with the result count. */
  header: React.ReactNode;
  /** Previous/Next links, shown from 768px up. */
  pagination: React.ReactNode;
}

type LoadState = "idle" | "loading" | "error";

/**
 * Phones: infinite scroll, 10 follow-ups at a time, triggered when the end of the list comes near.
 * Tablet/desktop: the server-rendered page plus Previous/Next links.
 */
export function FollowUpList({ initial, params, query, header, pagination }: FollowUpListProps) {
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
    const result = await loadFollowUpsPageAction(params, page + 1);
    busy.current = false;
    if (!result.ok) {
      setState("error");
      return;
    }
    setItems((prev) => {
      // Follow-ups logged while scrolling shift the offsets; drop repeats by id (O(n) with a Set).
      const seen = new Set(prev.map((i) => i.id));
      return [...prev, ...result.data.items.filter((i) => !seen.has(i.id))];
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
  const noun = total === 1 ? "follow-up" : "follow-ups";
  const suffix = query ? ` for "${query}"` : "";

  return (
    <>
      <StickyHeader>
        {header}
        <p className="mt-3 text-sm text-muted" aria-live="polite">
          <span className="md:hidden">{`${items.length} of ${total} ${noun}`}</span>
          <span className="max-md:hidden">{`${first}-${last} of ${total} ${noun}`}</span>
          {suffix}
        </p>
      </StickyHeader>

      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* From 768px up only the server page is shown, so a resize never mixes pages with the links. */}
        {items.map((item, i) => (
          <FollowUpCard key={item.id} item={item} className={i < initial.items.length ? undefined : "md:hidden"} />
        ))}
      </ul>

      <div className="md:hidden">
        {hasMore ? (
          <div ref={sentinel} className="space-y-3" aria-busy={state === "loading"}>
            {state === "error" ? (
              <div role="alert" className="flex items-center justify-between gap-3 rounded-[22px] bg-danger-soft p-4 text-sm font-medium text-on-danger-soft">
                Couldn&apos;t load more follow-ups.
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
                  Load more follow-ups
                </button>
              </>
            )}
          </div>
        ) : total > initial.pageSize ? (
          <p className="py-4 text-center text-sm text-muted">You&apos;ve seen all {total} follow-ups</p>
        ) : null}
      </div>

      <div className="max-md:hidden">{pagination}</div>
    </>
  );
}
