"use client";

import { useCallback, useState } from "react";
import { EditIcon, PlusIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import type { BranchDTO, UserDTO } from "@/lib/types";
import { UserForm } from "./user-form";

/** "New user" button that opens the create form in a sheet; closes after saving. */
export function NewUserSheet({ branches }: { branches: BranchDTO[] }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      title="New user"
      description="Register an employee. They complete sign-up with their phone and employee code."
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

/** "Edit" button on a user card that opens the edit form in a sheet; closes after saving. */
export function EditUserSheet({ user, branches }: { user: UserDTO; branches: BranchDTO[] }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      title="Edit user"
      description={`${user.name} · ${user.code}`}
      trigger={
        <Button variant="tonal" aria-label={`Edit ${user.name}`}>
          <EditIcon width={18} height={18} /> Edit
        </Button>
      }
    >
      {open ? <UserForm branches={branches} user={user} onSaved={close} /> : null}
    </Sheet>
  );
}
