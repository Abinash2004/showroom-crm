"use client";

import { useCallback, useState } from "react";
import { PlusIcon, StoreIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import type { BranchDTO } from "@/lib/types";
import { BranchForm } from "./branch-form";

/** "New branch" button that opens the create form in a sheet; closes after saving. */
export function NewBranchSheet() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      title="New branch"
      description="Add a showroom location."
      trigger={
        <Button className="w-full md:w-auto">
          <PlusIcon /> New branch
        </Button>
      }
    >
      {open ? <BranchForm onSaved={close} /> : null}
    </Sheet>
  );
}

/**
 * Branch card that is itself the edit trigger: tapping anywhere opens the edit sheet.
 * The trigger is stretched under the content (which ignores pointer events); interactive bits inside
 * `children` (e.g. Deactivate) opt back in with `pointer-events-auto`, so no button is nested in another.
 */
export function EditableBranchCard({ branch, children }: { branch: BranchDTO; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <article className="relative h-full rounded-[22px] bg-surface-2 transition-colors hover:bg-surface-2-hover">
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Edit branch"
        description={`${branch.name}, ${branch.location}, code ${branch.code}`}
        // Header shows which branch this is, in the card's tag style.
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full bg-status-opened/12 px-2.5 py-1 text-xs font-semibold leading-4 text-status-opened">
              <StoreIcon aria-hidden="true" width={12} height={12} className="shrink-0" />
              <span className="truncate">
                {branch.name} · {branch.location}
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center rounded-full bg-ink px-2.5 py-1 text-xs font-semibold leading-4 text-white">
              <span className="font-medium text-zinc-300">Code</span>&nbsp;<span className="text-[var(--accent-on-ink)]">{branch.code}</span>
            </span>
          </div>
        }
        // Start in the Name field rather than on the close button.
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement | null)?.querySelector<HTMLInputElement>("input[name=name]")?.focus();
        }}
        trigger={
          <button type="button" aria-haspopup="dialog" className="press absolute inset-0 rounded-[22px]">
            <span className="sr-only">Edit {branch.name}</span>
          </button>
        }
      >
        {open ? <BranchForm branch={branch} onSaved={close} /> : null}
      </Sheet>
      <div className="pointer-events-none relative flex h-full flex-col p-4">{children}</div>
    </article>
  );
}