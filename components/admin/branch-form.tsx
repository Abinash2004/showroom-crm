"use client";

import { useEffect } from "react";
import { createBranchAction, updateBranchAction } from "@/lib/actions/admin";
import { branchCreateSchema, branchUpdateSchema } from "@/lib/validators/entities";
import { Button } from "@/components/ui/button";
import { FormError, TextField } from "@/components/forms/fields";
import { useActionForm } from "@/components/forms/use-action-form";
import type { BranchDTO } from "@/lib/types";

interface BranchFormProps {
  branch?: BranchDTO;
  /** Called after a successful save, e.g. to close the sheet. */
  onSaved: () => void;
}

export function BranchForm({ branch, onSaved }: BranchFormProps) {
  const form = useActionForm(branch ? branchUpdateSchema : branchCreateSchema, (fd) =>
    branch ? updateBranchAction(branch.id, fd) : createBranchAction(fd),
  );

  useEffect(() => {
    if (form.successCount > 0) onSaved();
  }, [form.successCount, onSaved]);

  return (
    <form action={form.formAction} noValidate className="space-y-4">
      <FormError error={form.error} />
      <div className="grid grid-cols-2 items-start gap-3 [&>*]:min-w-0">
        {branch ? (
          <TextField label="Branch code" name="code" defaultValue={branch.code} readOnly hint="Can't be changed." />
        ) : (
          <TextField
            label="Branch code"
            name="code"
            required
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="e.g. HQ"
            defaultValue={form.value("code")}
            error={form.fieldError("code")}
          />
        )}
        <TextField
          label="Phone"
          name="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="off"
          placeholder="10 digits"
          required
          defaultValue={form.value("phone", branch?.phone ?? "")}
          error={form.fieldError("phone")}
        />
      </div>
      <TextField
        label="Name"
        name="name"
        required
        autoComplete="off"
        placeholder="e.g. Central Showroom"
        defaultValue={form.value("name", branch?.name ?? "")}
        error={form.fieldError("name")}
      />
      <TextField
        label="Location"
        name="location"
        required
        autoComplete="off"
        placeholder="Area, city"
        defaultValue={form.value("location", branch?.location ?? "")}
        error={form.fieldError("location")}
      />
      <Button type="submit" className="w-full" disabled={form.pending}>
        {form.pending ? "Saving..." : branch ? "Save changes" : "Create branch"}
      </Button>
    </form>
  );
}
