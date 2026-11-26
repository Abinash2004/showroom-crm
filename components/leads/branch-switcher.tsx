"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Spinner, StoreIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { buildHref } from "@/lib/url";
import { BranchListSheet, CompactBranchLabel } from "./branch-list-sheet";
import type { BranchOption } from "./branch-list-sheet";
import { chipClass } from "./chip-link";

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
          className={cn(chipClass(Boolean(selected)), "gap-2 pl-3", className)}
        >
          {pending ? (
            <Spinner aria-hidden="true" width={18} height={18} className="shrink-0" />
          ) : (
            <StoreIcon aria-hidden="true" width={18} height={18} className="shrink-0" />
          )}
          {selected ? (
            <CompactBranchLabel name={selected.name} location={selected.location} className="max-w-52" />
          ) : (
            <CompactBranchLabel name="All branches" location={`${branches.length} locations`} className="max-w-52" />
          )}
        </button>
      }
    />
  );
}
