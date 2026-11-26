"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Spinner, StoreIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { buildHref } from "@/lib/url";
import { BranchListSheet, CompactBranchLabel } from "./branch-list-sheet";
import type { BranchOption } from "./branch-list-sheet";

export type { BranchOption } from "./branch-list-sheet";

interface BranchSwitcherProps {
  /** Branches the user may see: all for admins, assigned ones for everyone else (resolved on the server). */
  branches: BranchOption[];
  selectedId?: string;
  /** Other active filters, kept when the branch changes. */
  base: Record<string, string | undefined>;
  /** List page to update (default: the lead list). */
  path?: string;
  /** Extra classes for the chip, e.g. a max width when it shares a row with the search box. */
  className?: string;
}

/**
 * Single-branch scope for the lead and follow-up lists: "All branches" or exactly one branch.
 * One tap opens the list, one tap applies and closes. No Apply button.
 */
export function BranchSwitcher({ branches, selectedId, base, path = "/leads", className }: BranchSwitcherProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const selected = selectedId ? branches.find((b) => b.id === selectedId) : undefined;

  // With one branch (or none) there is nothing to choose, so no chip at all.
  if (branches.length < 2) return null;

  return (
    <BranchListSheet
      branches={branches}
      selectedId={selected?.id}
      allowAll
      title="Choose branch"
      description="Show every branch or just one."
      onSelect={(id) => {
        if (id === selectedId) return;
        startTransition(() => {
          router.replace(buildHref(path, { ...base, branchId: id }), { scroll: false });
        });
      }}
      trigger={
        <button
          type="button"
          aria-label={`Branch: ${selected ? `${selected.name}, ${selected.location}` : "All branches"}. Change branch`}
          aria-haspopup="dialog"
          className={cn(
            // Always in the selected (Obsidian) style: the branch scope is always set, "All branches" included.
            "press flex min-h-12 max-w-full items-center gap-2.5 rounded-full bg-ink py-1.5 pl-1.5 pr-3.5 text-left text-white transition-colors hover:bg-ink/90",
            className,
          )}
        >
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15"
          >
            {pending ? <Spinner width={18} height={18} /> : <StoreIcon width={18} height={18} />}
          </span>
          {selected ? (
            <CompactBranchLabel name={selected.name} location={selected.location} className="min-w-0" nameClassName="text-[var(--accent-on-ink)]" />
          ) : (
            <CompactBranchLabel
              name="All branches"
              location={`${branches.length} locations`}
              className="min-w-0"
              nameClassName="text-[var(--accent-on-ink)]"
            />
          )}
        </button>
      }
    />
  );
}
