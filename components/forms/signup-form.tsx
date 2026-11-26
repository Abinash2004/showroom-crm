"use client";

import { signupAction } from "@/lib/actions/auth";
import { signupSchema } from "@/lib/validators/auth";
import { Button } from "@/components/ui/button";
import { FormError, TextField } from "./fields";
import { useActionForm } from "./use-action-form";

export function SignupForm() {
  const form = useActionForm(signupSchema, signupAction);
  return (
    <form action={form.formAction} noValidate className="space-y-4">
      <FormError error={form.error} />
      <TextField
        label="Phone number"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="username"
        required
        defaultValue={form.value("phone")}
        error={form.fieldError("phone")}
      />
      <TextField
        label="Employee code"
        name="code"
        autoComplete="off"
        autoCapitalize="characters"
        required
        hint="Shared with you by your administrator."
        defaultValue={form.value("code")}
        error={form.fieldError("code")}
      />
      <TextField
        label="Create password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="At least 8 characters with a letter and a number."
        error={form.fieldError("password")}
      />
      <TextField
        label="Confirm password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        error={form.fieldError("confirmPassword")}
      />
      <Button type="submit" className="w-full" disabled={form.pending}>
        {form.pending ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}