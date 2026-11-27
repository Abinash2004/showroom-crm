"use client";

import { useId, useState } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/icons";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import type { ActionError } from "@/lib/errors";
import { cn } from "@/lib/cn";

/** Tactile pebble input (see `.field` in globals.css for rest/focus/invalid states). */
const control = "field min-h-12 w-full px-4 py-3 text-base";

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
      <label htmlFor={id} className="block text-[0.8125rem] font-semibold text-fg">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && !error ? (
        <p id={hintId} className="text-xs text-muted">
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
          className={cn(control, className)}
          {...props}
        />
      )}
    </Shell>
  );
}

/** Password input with a show/hide toggle inside the field. The value and form submission are unchanged. */
export function PasswordField({ label, error, hint, className, ...props }: CommonProps & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <Shell label={label} error={error} hint={hint} required={props.required}>
      {({ id, describedBy, invalid }) => (
        <div className="relative">
          <input
            id={id}
            type={visible ? "text" : "password"}
            aria-invalid={invalid}
            aria-describedby={describedBy}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className={cn(control, "pr-14", className)}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
            aria-pressed={visible}
            aria-controls={id}
            className="press absolute right-1 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:text-fg"
          >
            {visible ? <EyeOffIcon width={20} height={20} aria-hidden="true" /> : <EyeIcon width={20} height={20} aria-hidden="true" />}
          </button>
        </div>
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
          className={cn(control, "resize-y [overflow-wrap:anywhere]", className)}
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
    <label htmlFor={id} className={cn("flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl bg-surface-2 px-4", className)}>
      <input id={id} type="checkbox" className="size-5 shrink-0 accent-[var(--primary)]" {...props} />
      <span className="text-base">{label}</span>
    </label>
  );
}

export function FormError({ error }: { error: ActionError | null }) {
  if (!error) return null;
  const retry = error.retryAfterSec ? ` Try again in ${error.retryAfterSec}s.` : "";
  return (
    <div role="alert" className="rounded-2xl bg-danger-soft p-4 text-sm font-medium text-on-danger-soft">
      {error.message}
      {retry}
    </div>
  );
}