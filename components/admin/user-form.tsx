"use client";

import { useEffect, useState } from "react";
import { createUserAction, updateUserAction } from "@/lib/actions/admin";
import { userCreateSchema, userUpdateSchema } from "@/lib/validators/entities";
import { Button } from "@/components/ui/button";
import { CheckboxField, FormError, TextField } from "@/components/forms/fields";
import { useActionForm } from "@/components/forms/use-action-form";
import type { BranchDTO, UserDTO } from "@/lib/types";

interface UserFormProps {
  branches: BranchDTO[];
  user?: UserDTO;
  /** Called after a successful save, e.g. to close the sheet. */
  onSaved: () => void;
}

export function UserForm({ branches, user, onSaved }: UserFormProps) {
  const form = useActionForm(user ? userUpdateSchema : userCreateSchema, (fd) =>
    user ? updateUserAction(user.id, fd) : createUserAction(fd),
  );
  const selected = new Set(form.values("branchIds", user?.branchIds ?? []));
  const branchError = form.fieldError("branchIds");
  // Admins see every branch, so the branch list only matters for non-admins.
  const [isAdmin, setIsAdmin] = useState(() => form.values("isAdmin", user?.isAdmin ? ["on"] : []).length > 0);

  useEffect(() => {
    if (form.successCount > 0) onSaved();
  }, [form.successCount, onSaved]);

  return (
    <form action={form.formAction} noValidate className="space-y-4">
      <FormError error={form.error} />
      <div className="grid grid-cols-2 items-start gap-3 [&>*]:min-w-0">
        {user ? (
          <TextField label="Employee code" name="code" defaultValue={user.code} readOnly hint="Can't be changed." />
        ) : (
          <TextField
            label="Employee code"
            name="code"
            required
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="e.g. EMP101"
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
          defaultValue={form.value("phone", user?.phone ?? "")}
          error={form.fieldError("phone")}
        />
      </div>
      {!user ? (
        <p className="-mt-2 text-sm text-muted">Share the employee code with the user outside the app. They need it with their phone to sign up.</p>
      ) : null}
      <TextField
        label="Name"
        name="name"
        required
        autoComplete="off"
        defaultValue={form.value("name", user?.name ?? "")}
        error={form.fieldError("name")}
      />
      <CheckboxField
        label="Administrator (full access to all branches)"
        name="isAdmin"
        checked={isAdmin}
        onChange={(e) => setIsAdmin(e.currentTarget.checked)}
        className="rounded-xl border border-line px-3"
      />
      {/* Hidden and disabled for admins: disabled controls aren't posted; ticks are kept if admin is unchecked again. */}
      <fieldset className="min-w-0 space-y-1" hidden={isAdmin} disabled={isAdmin} aria-describedby={branchError ? "branch-error" : undefined}>
        <legend className="mb-1 text-sm font-medium">
          Assigned branches <span className="text-danger">*</span>
        </legend>
        {branches.length === 0 ? <p className="text-sm text-muted">Create a branch first.</p> : null}
        <div className="grid gap-1 md:grid-cols-2">
          {branches.map((b) => (
            <CheckboxField
              key={b.id}
              label={`${b.name}${b.isActive ? "" : " (inactive)"}`}
              name="branchIds"
              value={b.id}
              defaultChecked={selected.has(b.id)}
            />
          ))}
        </div>
        <p id="branch-error" role={branchError ? "alert" : undefined} className={branchError ? "text-sm font-medium text-danger" : "hidden"}>
          {branchError}
        </p>
      </fieldset>
      <Button type="submit" className="w-full" disabled={form.pending}>
        {form.pending ? "Saving..." : user ? "Save changes" : "Create user"}
      </Button>
    </form>
  );
}
