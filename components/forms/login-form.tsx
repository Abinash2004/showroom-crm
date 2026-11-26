"use client";

import { loginAction } from "@/lib/actions/auth";
import { loginSchema } from "@/lib/validators/auth";
import { Button } from "@/components/ui/button";
import { FormError, PasswordField, TextField } from "./fields";
import { useActionForm } from "./use-action-form";

export function LoginForm() {
  const form = useActionForm(loginSchema, loginAction);
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
      <PasswordField
        label="Password"
        name="password"
        autoComplete="current-password"
        required
        error={form.fieldError("password")}
      />
      <Button type="submit" variant="primary" className="w-full" disabled={form.pending}>
        {form.pending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}