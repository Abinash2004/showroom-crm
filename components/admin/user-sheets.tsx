"use client";

import { useCallback, useState } from "react";
import { PlusIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import type { BranchDTO, UserDTO } from "@/lib/types";
import { UserForm } from "./user-form";

/** Start in the Name field rather than on the close button. */
function focusName(e: Event) {
  e.preventDefault();
  (e.currentTarget as HTMLElement | null)?.querySelector<HTMLInputElement>("input[name=name]")?.focus();
}

/** "New user" button that opens the create form in a sheet; closes after saving. */
export function NewUserSheet({ branches }: { branches: BranchDTO[] }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      title="New user"
      description="Register an employee."
      onOpenAutoFocus={focusName}
      trigger={
        <Button className="w-full md:w-auto">
          <PlusIcon /> New user
        </Button>
      }
    >
      {open ? <UserForm branches={branches} onSaved={close} /> : null}
    </Sheet>
  );
}

/**
 * User card that is itself the edit trigger: tapping anywhere opens the edit sheet.
 * The trigger is stretched under the content (which ignores pointer events); interactive bits inside
 * `children` (e.g. Deactivate) opt back in with `pointer-events-auto`, so no button is nested in another.
 */
export function EditableUserCard({ user, branches, children }: { user: UserDTO; branches: BranchDTO[]; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <article className="relative h-full rounded-[22px] bg-surface-2 transition-colors hover:bg-surface-2-hover">
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Edit user"
        description={`${user.name}, code ${user.code}`}
        // Header shows who this is, in the card's tag style.
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex min-w-0 max-w-full items-center rounded-full bg-status-opened/12 px-2.5 py-1 text-xs font-semibold leading-4 text-status-opened">
              <span className="truncate">{user.name}</span>
            </span>
            <span className="inline-flex shrink-0 items-center rounded-full bg-ink px-2.5 py-1 text-xs font-semibold leading-4 text-white">
              <span className="font-medium text-zinc-300">Code</span>&nbsp;<span className="text-[var(--accent-on-ink)]">{user.code}</span>
            </span>
          </div>
        }
        onOpenAutoFocus={focusName}
        trigger={
          <button type="button" aria-haspopup="dialog" className="press absolute inset-0 rounded-[22px]">
            <span className="sr-only">Edit {user.name}</span>
          </button>
        }
      >
        {open ? <UserForm branches={branches} user={user} onSaved={close} /> : null}
      </Sheet>
      <div className="pointer-events-none relative flex h-full flex-col p-4">{children}</div>
    </article>
  );
}
