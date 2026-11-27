"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CalendarIcon, EyeIcon, EyeOffIcon } from "@/components/icons";
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

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DISPLAY_DATE = /^(\d{2})-(\d{2})-(\d{4})$/;

/** yyyy-mm-dd (the value the server receives) to dd-mm-yyyy (what the user sees). */
function isoToDisplay(iso: string): string {
  if (!ISO_DATE.test(iso)) return "";
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}

/** dd-mm-yyyy to yyyy-mm-dd, or "" when it isn't a real calendar date. */
function displayToIso(text: string): string {
  const m = DISPLAY_DATE.exec(text);
  if (!m) return "";
  const [, d, mo, y] = m;
  const iso = `${y}-${mo}-${d}`;
  const parsed = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== iso ? "" : iso;
}

/** Keeps only digits and inserts the dashes as the user types: 2 digits, dash, 2 digits, dash, 4 digits. */
function maskDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean);
  return parts.join("-");
}

interface DateFieldProps {
  label: string;
  name: string;
  required?: boolean;
  /** Latest allowed date, yyyy-mm-dd (today for every date field here). */
  max?: string;
  /** Initial value, yyyy-mm-dd. */
  defaultValue?: string;
  error?: string;
}

/**
 * Date input that always shows dd-mm-yyyy, whatever the device locale. Typing is masked; a calendar
 * button opens the native picker, which fills the same text. The hidden field submits yyyy-mm-dd, so the
 * server schemas and actions are unchanged.
 */
export function DateField({ label, name, required, max, defaultValue = "", error }: DateFieldProps) {
  const [text, setText] = useState(() => isoToDisplay(defaultValue));
  const pickerRef = useRef<HTMLInputElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const iso = displayToIso(text);

  // The submitted value lives in the hidden input and only updates after React renders. Forms that read their
  // fields on input events (the lead editor's change counter) would see the previous value, so announce the
  // new one once it is committed. Skipped on mount.
  const announced = useRef(iso);
  useEffect(() => {
    if (announced.current === iso) return;
    announced.current = iso;
    hiddenRef.current?.dispatchEvent(new Event("input", { bubbles: true }));
  }, [iso]);
  const incomplete = text.length === 10 && !iso;
  const tooLate = Boolean(iso && max && iso > max);
  const message = error ?? (incomplete ? "Enter a real date as dd-mm-yyyy." : tooLate ? "Date can't be in the future." : undefined);

  return (
    <Shell label={label} error={message} required={required}>
      {({ id, describedBy, invalid }) => (
        <div className="relative">
          <input
            id={id}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="dd-mm-yyyy"
            maxLength={10}
            value={text}
            onChange={(e) => setText(maskDisplay(e.target.value))}
            aria-invalid={invalid}
            aria-describedby={describedBy}
            className={cn(control, "pr-14 tabular-nums")}
          />
          <input ref={hiddenRef} type="hidden" name={name} value={iso} readOnly />
          <input
            ref={pickerRef}
            type="date"
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
            max={max}
            value={iso}
            onChange={(e) => setText(isoToDisplay(e.target.value))}
          />
          <button
            type="button"
            aria-label={`Open calendar for ${label}`}
            onClick={() => {
              const el = pickerRef.current;
              if (!el) return;
              try {
                el.showPicker();
              } catch {
                el.focus();
              }
            }}
            className="press absolute right-1 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:text-fg"
          >
            <CalendarIcon width={20} height={20} aria-hidden="true" />
          </button>
        </div>
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