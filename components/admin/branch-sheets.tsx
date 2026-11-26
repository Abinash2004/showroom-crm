"use client";

import { useCallback, useState } from "react";
import { EditIcon, PlusIcon } from "@/components/icons";
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
      description="Add a showroom location. Users can be assigned to it after it's created."
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

/** "Edit" button on a branch card that opens the edit form in a sheet; closes after saving. */
export function EditBranchSheet({ branch }: { branch: BranchDTO }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      title="Edit branch"
      description={`${branch.name} · ${branch.code}`}
      trigger={
        <Button variant="tonal" aria-label={`Edit ${branch.name}`}>
          <EditIcon width={18} height={18} /> Edit
        </Button>
      }
    >
      {open ? <BranchForm branch={branch} onSaved={close} /> : null}
    </Sheet>
  );
}
