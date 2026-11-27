"use client";

import { useId, useState } from "react";
import { StoreIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { BranchListSheet, CompactBranchLabel } from "./branch-list-sheet";
import type { BranchOption } from "./branch-list-sheet";

interface BranchFieldProps {
  name: string;
  label: string;
  branches: BranchOption[];
  defaultValue?: string;
  error?: string;
}

/**
 * Branch picker in the branch-chip colours (Obsidian, light icon tile, name in the
 * accent green, location underneath) with the inputs' 16px corners. Same height as the text inputs (py-3 + 24px line + 2px border),
 * so it lines up with the field beside it.
 */
const control =
  "flex min-h-[3.125rem] w-full items-center gap-2.5 rounded-2xl border bg-ink py-1 pl-1.5 pr-4 text-left text-white transition-colors";

/**
 * Form field version of the branch switcher: tap opens the same branch sheet, one tap picks.
 * The value is posted through a hidden input. With a single branch it is fixed and not tappable.
 */
export function BranchField({ name, label, branches, defaultValue, error }: BranchFieldProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const errorId = `${id}-error`;
  const valueId = `${id}-value`;
  const only = branches.length === 1 ? branches[0] : undefined;
  const [value, setValue] = useState(only?.id ?? defaultValue ?? "");
  const selected = branches.find((b) => b.id === value);
  // The schema reports an empty id as "Invalid identifier"; say what the user should do instead.
  const message = error ? (selected ? error : "Select a branch") : undefined;

  const content = (
    <>
      <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
        <StoreIcon width={18} height={18} />
      </span>
      {selected ? (
        <CompactBranchLabel
          name={selected.name}
          location={selected.location}
          nameClassName="text-[var(--accent-on-ink)] lg:shrink-0"
          // Phones/tablets: location under the name. Desktop: on the same line, to the right.
          className="lg:flex-row lg:items-baseline lg:gap-2"
        />
      ) : (
        <span className="truncate text-sm font-medium text-zinc-300">Select branch</span>
      )}
    </>
  );

  return (
    <div className="space-y-1.5">
      <span id={labelId} className="block text-[0.8125rem] font-semibold">
        {label}
        <span className="text-danger"> *</span>
      </span>
      <input type="hidden" name={name} value={value} />
      {only ? (
        <div aria-labelledby={labelId} role="group" className={cn(control, "border-transparent")}>
          {content}
        </div>
      ) : (
        <BranchListSheet
          branches={branches}
          selectedId={value || undefined}
          title="Choose branch"
          description="Which branch did the customer visit?"
          onSelect={(next) => setValue(next ?? "")}
          trigger={
            <button
              type="button"
              aria-haspopup="dialog"
              aria-labelledby={`${labelId} ${valueId}`}
              aria-describedby={message ? errorId : undefined}
              className={cn("press hover:bg-ink/90", control, message ? "border-danger ring-2 ring-danger/30" : "border-transparent")}
            >
              {content}
              <span id={valueId} className="sr-only">{selected ? `${selected.name}, ${selected.location}. Change branch` : "Select branch"}</span>
            </button>
          }
        />
      )}
      <p id={errorId} role={message ? "alert" : undefined} className={cn("text-sm font-medium text-danger", !message && "hidden")}>
        {message}
      </p>
    </div>
  );
}
