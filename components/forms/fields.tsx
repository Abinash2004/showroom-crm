"use client";

import { useId } from "react";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import type { ActionError } from "@/lib/errors";
import { cn } from "@/lib/cn";

const control =
  "min-h-12 w-full rounded-xl border bg-surface px-4 py-3 text-base text-fg placeholder:text-muted aria-[invalid=true]:border-danger";

interface ShellProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => React.ReactNode;
}

function Shell({ label, error, hint, required, children }: ShellProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && !error ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      <p id={errorId} role={error ? "alert" : undefined} className={cn("text-sm font-medium text-danger", !error && "hidden")}>
        {error}
      </p>
    </div>
  );
}

type CommonProps = { label: string; error?: string; hint?: string };

export function TextField({ label, error, hint, className, ...props }: CommonProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Shell label={label} error={error} hint={hint} required={props.required}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className={cn(control, invalid ? "border-danger" : "border-line", className)}
          {...props}
        />
      )}
    </Shell>
  );
}

export function TextAreaField({ label, error, hint, className, ...props }: CommonProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Shell label={label} error={error} hint={hint} required={props.required}>
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          rows={4}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className={cn(control, invalid ? "border-danger" : "border-line", className)}
          {...props}
        />
      )}
    </Shell>
  );
}

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

export function CheckboxField({ label, className, ...props }: CheckboxProps) {
  const id = useId();
  return (
    <label htmlFor={id} className={cn("flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-1", className)}>
      <input id={id} type="checkbox" className="size-6 accent-[var(--primary)]" {...props} />
      <span className="text-base">{label}</span>
    </label>
  );
}

export function FormError({ error }: { error: ActionError | null }) {
  if (!error) return null;
  const retry = error.retryAfterSec ? ` Try again in ${error.retryAfterSec}s.` : "";
  return (
    <div role="alert" className="rounded-xl bg-danger-soft p-4 text-sm font-medium text-on-danger-soft">
      {error.message}
      {retry}
    </div>
  );
}