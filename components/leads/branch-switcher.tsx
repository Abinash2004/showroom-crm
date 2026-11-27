"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useBusySignal } from "@/components/layout/busy";
import { Spinner, StoreIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { rememberBranch } from "@/lib/branch-preference";
import { buildHref } from "@/lib/url";
import { BranchListSheet, CompactBranchLabel } from "./branch-list-sheet";
import type { BranchOption } from "./branch-list-sheet";

export type { BranchOption } from "./branch-list-sheet";

interface BranchSwitcherProps {
  /** Branches the user may see: all for admins, assigned ones for everyone else (resolved on the server). */
  branches: BranchOption[];
  selectedId: string | undefined;
  /** Other active filters, kept when the branch changes. */
  base: Record<string, string | undefined>;
  /** List page to update (default: the lead list). */
  path?: string;
  /** Extra classes for the chip, e.g. a max width when it shares a row with the search box. */
  className?: string;
}

/**
 * Single-branch scope for the lead and follow-up lists: always exactly one branch (no "All branches").
 * One tap opens the list, one tap applies and closes. No Apply button.
 */
export function BranchSwitcher({ branches, selectedId, base, path = "/leads", className }: BranchSwitcherProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useBusySignal(pending);
  // The page always resolves a branch; the fallback only guards against a stale id.
  const selected = branches.find((b) => b.id === selectedId) ?? branches[0];

  // With one branch (or none) there is nothing to choose, so no chip at all.
  if (!selected || branches.length < 2) return null;

  return (
    <BranchListSheet
      branches={branches}
      selectedId={selected.id}
      title="Choose branch"
      description="Leads and follow-ups are shown one branch at a time."
      onSelect={(id) => {
        if (!id || id === selected.id) return;
        // Remembered for the visit: the other list (Leads / Follow-ups) opens on the same branch.
        rememberBranch(id);
        startTransition(() => {
          router.replace(buildHref(path, { ...base, branchId: id }), { scroll: false });
        });
      }}
      trigger={
        <button
          type="button"
          aria-label={`Branch: ${selected.name}, ${selected.location}. Change branch`}
          aria-haspopup="dialog"
          className={cn(
            // Always in the selected (Obsidian) style: a branch is always selected.
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
          <CompactBranchLabel name={selected.name} location={selected.location} className="min-w-0" nameClassName="text-[var(--accent-on-ink)]" />
        </button>
      }
    />
  );
}
