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

/** Paired fields share a row 50/50; min-w-0 lets the narrow columns shrink below their content width. */
const ROW = "grid grid-cols-2 items-start gap-3 [&>*]:min-w-0";

/**
 * Create: [employee code | phone], name, admin, branches.
 * Edit: [name | phone], admin, branches. The code can't change, so it is shown in the sheet header
 * instead of as a read-only field (the update schema doesn't take it).
 */
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

  const name = (
    <TextField
      label="Name"
      name="name"
      required
      autoComplete="off"
      placeholder="Full name"
      defaultValue={form.value("name", user?.name ?? "")}
      error={form.fieldError("name")}
    />
  );
  const phone = (
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
  );

  return (
    <form action={form.formAction} noValidate className="space-y-4">
      <FormError error={form.error} />
      {user ? (
        <div className={ROW}>
          {name}
          {phone}
        </div>
      ) : (
        <>
          <div className={ROW}>
            <TextField
              label="Employee code"
              name="code"
              required
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="e.g. EMP-01"
              hint="Share it with the user to sign up."
              defaultValue={form.value("code")}
              error={form.fieldError("code")}
            />
            {phone}
          </div>
          {name}
        </>
      )}

      <CheckboxField
        label="Administrator (all branches)"
        name="isAdmin"
        checked={isAdmin}
        onChange={(e) => setIsAdmin(e.currentTarget.checked)}
      />

      {/* Hidden and disabled for admins: disabled controls aren't posted; ticks are kept if admin is unchecked again. */}
      <fieldset className="min-w-0 space-y-2" hidden={isAdmin} disabled={isAdmin} aria-describedby={branchError ? "branch-error" : undefined}>
        <legend className="mb-2 text-[0.8125rem] font-semibold">
          Assigned branches <span className="text-danger">*</span>
        </legend>
        {branches.length === 0 ? <p className="text-sm text-muted">Create a branch first.</p> : null}
        <div className="grid grid-cols-2 gap-2 [&>*]:min-w-0">
          {/* Two fixed lines per option (name / location + status), each truncated, so options never wrap
              and every tile in the grid has the same height. */}
          {branches.map((b) => (
            <label
              key={b.id}
              className="flex min-h-14 cursor-pointer items-center gap-2.5 rounded-2xl bg-surface-2 px-3 py-2 sm:gap-3 sm:px-4 transition-colors hover:bg-surface-2-hover has-[:checked]:bg-ink has-[:checked]:text-white"
            >
              <input
                type="checkbox"
                name="branchIds"
                value={b.id}
                defaultChecked={selected.has(b.id)}
                className="size-5 shrink-0 accent-[var(--primary)]"
              />
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[0.9375rem] font-medium">{b.name}</span>
                <span className="mt-0.5 block truncate text-xs opacity-70">
                  {b.location}
                  {b.isActive ? null : " · Inactive"}
                </span>
              </span>
            </label>
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
