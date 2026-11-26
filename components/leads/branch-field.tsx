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
  /** Called after the user picks a branch (the hidden input does not fire input/change events). */
  onValueChange?: (id: string) => void;
}

/** Same height as the text inputs (py-3 + 24px line + 2px border), so it lines up with the field beside it. */
const control = "flex min-h-[3.125rem] w-full items-center gap-2 rounded-xl border bg-surface px-3 text-left text-fg";

/**
 * Form field version of the branch switcher: tap opens the same branch sheet, one tap picks.
 * The value is posted through a hidden input. With a single branch it is fixed and not tappable.
 */
export function BranchField({ name, label, branches, defaultValue, error, onValueChange }: BranchFieldProps) {
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
      <StoreIcon aria-hidden="true" width={18} height={18} className="shrink-0 text-muted" />
      {selected ? (
        <CompactBranchLabel name={selected.name} location={selected.location} />
      ) : (
        <span className="truncate text-base text-muted">Select</span>
      )}
    </>
  );

  return (
    <div className="space-y-1.5">
      <span id={labelId} className="block text-sm font-medium">
        {label}
        <span className="text-danger"> *</span>
      </span>
      <input type="hidden" name={name} value={value} />
      {only ? (
        <div aria-labelledby={labelId} role="group" className={cn(control, "border-line bg-surface-2")}>
          {content}
        </div>
      ) : (
        <BranchListSheet
          branches={branches}
          selectedId={value || undefined}
          title="Choose branch"
          description="Which branch did the customer visit?"
          onSelect={(next) => {
            setValue(next ?? "");
            onValueChange?.(next ?? "");
          }}
          trigger={
            <button
              type="button"
              aria-haspopup="dialog"
              aria-labelledby={`${labelId} ${valueId}`}
              aria-describedby={message ? errorId : undefined}
              className={cn("press", control, message ? "border-danger" : "border-line")}
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
