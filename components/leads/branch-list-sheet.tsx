"use client";

import { useMemo, useState } from "react";
import { CheckIcon, PinIcon, SearchIcon, StoreIcon } from "@/components/icons";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";

export interface BranchOption {
  id: string;
  name: string;
  location: string;
  isActive: boolean;
}

/** Show a search box in the sheet only when the list is long enough to need it. */
const SEARCH_THRESHOLD = 7;

export function BranchLabel({ name, location, inactive }: { name: string; location?: string; inactive?: boolean }) {
  return (
    <span className="min-w-0 flex-1 text-left">
      <span className="flex items-center gap-2">
        <span className="truncate text-base font-semibold">{name}</span>
        {inactive ? (
          <span className="shrink-0 rounded-full bg-neutral-soft px-2 py-0.5 text-[11px] font-semibold text-on-neutral-soft">Inactive</span>
        ) : null}
      </span>
      {location ? (
        <span className="mt-0.5 flex items-center gap-1 text-sm text-muted">
          <PinIcon width={14} height={14} className="shrink-0" />
          <span className="truncate">{location}</span>
        </span>
      ) : null}
    </span>
  );
}

/** Compact two-line label: name on top, location below. Fits a 48px control. */
export function CompactBranchLabel({ name, location, className }: { name: string; location: string; className?: string }) {
  return (
    <span className={cn("flex min-w-0 flex-col text-left leading-tight", className)}>
      <span className="truncate text-sm font-semibold">{name}</span>
      <span className="truncate text-xs opacity-75">{location}</span>
    </span>
  );
}

interface BranchListSheetProps {
  branches: BranchOption[];
  selectedId?: string;
  /** Adds an "All branches" row at the top (list filters). Forms pick exactly one branch. */
  allowAll?: boolean;
  onSelect: (id: string | undefined) => void;
  trigger: React.ReactNode;
  title: string;
  description: string;
}

/**
 * Bottom sheet with every branch as a large two-line row (name + location).
 * One tap selects and closes. A search box appears for long lists.
 */
export function BranchListSheet({ branches, selectedId, allowAll = false, onSelect, trigger, title, description }: BranchListSheetProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return branches;
    return branches.filter((b) => b.name.toLowerCase().includes(q) || b.location.toLowerCase().includes(q));
  }, [branches, query]);

  function choose(id: string | undefined) {
    setOpen(false);
    setQuery("");
    onSelect(id);
  }

  const rowClass = (active: boolean) =>
    cn(
      "press flex min-h-16 w-full items-center gap-3 rounded-2xl px-3 py-2 text-left",
      active ? "bg-primary-soft text-on-primary-soft" : "text-fg",
    );

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
      title={title}
      description={description}
      trigger={trigger}
    >
      <div className="space-y-3">
        {branches.length >= SEARCH_THRESHOLD ? (
          <div className="relative">
            <label htmlFor="branch-search" className="sr-only">
              Find a branch by name or location
            </label>
            <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
              <SearchIcon width={20} height={20} />
            </span>
            <input
              id="branch-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find branch or location"
              autoComplete="off"
              enterKeyHint="search"
              className="min-h-12 w-full rounded-full border border-line bg-surface pl-12 pr-4 text-base placeholder:text-muted"
            />
          </div>
        ) : null}

        <ul className="space-y-1" aria-label="Branches">
          {allowAll && !query.trim() ? (
            <li>
              <button type="button" aria-pressed={!selectedId} onClick={() => choose(undefined)} className={rowClass(!selectedId)}>
                <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-fg">
                  <StoreIcon width={20} height={20} />
                </span>
                <BranchLabel name="All branches" location={`${branches.length} branches`} />
                {!selectedId ? <CheckIcon aria-hidden="true" width={20} height={20} className="shrink-0" /> : null}
              </button>
            </li>
          ) : null}
          {visible.map((b) => {
            const active = b.id === selectedId;
            return (
              <li key={b.id}>
                <button type="button" aria-pressed={active} onClick={() => choose(b.id)} className={rowClass(active)}>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                      active ? "bg-primary text-on-primary" : "bg-surface-2 text-fg",
                    )}
                  >
                    {b.name.trim().charAt(0).toUpperCase()}
                  </span>
                  <BranchLabel name={b.name} location={b.location} inactive={!b.isActive} />
                  {active ? <CheckIcon aria-hidden="true" width={20} height={20} className="shrink-0" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
        {visible.length === 0 ? (
          <p role="status" className="py-6 text-center text-sm text-muted">
            No branch matches &ldquo;{query.trim()}&rdquo;
          </p>
        ) : null}
      </div>
    </Sheet>
  );
}
