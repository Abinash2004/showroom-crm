"use client";

import { useMemo, useState } from "react";
import { CheckIcon, PinIcon, SearchIcon } from "@/components/icons";
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

function BranchLabel({
  name,
  location,
  inactive,
  selected,
}: {
  name: string;
  location?: string;
  inactive?: boolean;
  selected: boolean;
}) {
  // One line on every screen size: name, then location to its right, then the inactive note.
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
      <span className={cn("min-w-0 shrink truncate text-base font-semibold", selected && "text-[var(--accent-on-ink)]")}>{name}</span>
      {location ? (
        <span className={cn("flex min-w-0 shrink-[2] items-center gap-1 text-sm", selected ? "text-zinc-300" : "text-muted")}>
          <PinIcon aria-hidden="true" width={14} height={14} className="shrink-0" />
          <span className="truncate">{location}</span>
        </span>
      ) : null}
      {inactive ? (
        <span className={cn("shrink-0 text-[0.6875rem] font-semibold", selected ? "text-zinc-300" : "text-muted")}>· Inactive</span>
      ) : null}
    </span>
  );
}

/** Compact two-line label: name on top, location below. Fits a 48px control. */
export function CompactBranchLabel({
  name,
  location,
  className,
  nameClassName,
}: {
  name: string;
  location: string;
  className?: string;
  nameClassName?: string;
}) {
  return (
    <span className={cn("flex min-w-0 flex-col text-left leading-tight", className)}>
      <span className={cn("truncate text-sm font-semibold", nameClassName)}>{name}</span>
      <span className="truncate text-xs opacity-75">{location}</span>
    </span>
  );
}

interface BranchListSheetProps {
  branches: BranchOption[];
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
  trigger: React.ReactNode;
  title: string;
  description: string;
}

/**
 * Bottom sheet with every branch as a large two-line row (name + location).
 * One tap selects and closes. A search box appears for long lists.
 */
export function BranchListSheet({ branches, selectedId, onSelect, trigger, title, description }: BranchListSheetProps) {
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
      // Same language as the chips: pebble tile at rest, Obsidian when selected (name in the accent green).
      "press flex min-h-16 w-full items-center gap-3 rounded-[22px] px-3 py-2.5 text-left transition-colors",
      active ? "bg-ink text-white" : "bg-surface-2 text-fg hover:bg-surface-2-hover",
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
              className="field min-h-12 w-full rounded-full pl-12 pr-4 text-base"
            />
          </div>
        ) : null}

        <ul className="space-y-2" aria-label="Branches">
          {visible.map((b) => {
            const active = b.id === selectedId;
            return (
              <li key={b.id}>
                <button type="button" aria-pressed={active} onClick={() => choose(b.id)} className={rowClass(active)}>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                      active ? "bg-white/15 text-white" : "bg-surface text-fg",
                    )}
                  >
                    {b.name.trim().charAt(0).toUpperCase()}
                  </span>
                  <BranchLabel name={b.name} location={b.location} inactive={!b.isActive} selected={active} />
                  {active ? <CheckIcon aria-hidden="true" width={20} height={20} className="shrink-0 text-[var(--accent-on-ink)]" /> : null}
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
