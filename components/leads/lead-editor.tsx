"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { FormEvent } from "react";
import { updateLeadAction } from "@/lib/actions/leads";
import { CheckIcon, ChevronDownIcon, PhoneIcon } from "@/components/icons";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { DateField, FormError, TextAreaField, TextField } from "@/components/forms/fields";
import { useActionForm } from "@/components/forms/use-action-form";
import { cn } from "@/lib/cn";
import { LEAD_STATUSES } from "@/lib/constants";
import { formatPhone, toInputDate } from "@/lib/format";
import type { LeadDTO } from "@/lib/types";
import { leadEditSchema } from "@/lib/validators/entities";
import { BranchField } from "./branch-field";
import type { BranchOption } from "./branch-list-sheet";

type Snapshot = Record<string, string>;

const FIELDS = ["status", "branchId", "visitDate", "customerName", "customerPhone", "alternativePhone", "customerLocation", "vehicleDetails"] as const;

function baseline(lead: LeadDTO): Snapshot {
  return {
    status: lead.status,
    branchId: lead.branchId,
    visitDate: toInputDate(lead.visitDate),
    customerName: lead.customerName,
    customerPhone: lead.customerPhone,
    alternativePhone: lead.alternativePhone ?? "",
    customerLocation: lead.customerLocation ?? "",
    vehicleDetails: lead.vehicleDetails ?? "",
  };
}

/** Number of fields that differ from the saved lead. O(fields). Whitespace-only edits don't count. */
function countChanges(form: HTMLFormElement, saved: Snapshot): number {
  const fd = new FormData(form);
  let n = 0;
  for (const key of FIELDS) {
    const raw = fd.get(key);
    const value = typeof raw === "string" ? raw.trim() : "";
    if (value !== (saved[key] ?? "").trim()) n++;
  }
  return n;
}

const phoneDigits = (v: string) => v.replace(/[\s-]/g, "");

/** Phone input with a 44px call button beside it. Calls whatever is typed once it is a full 10-digit number. */
function PhoneInput({
  label,
  name,
  defaultValue,
  required,
  error,
  customer,
}: {
  label: string;
  name: string;
  defaultValue: string;
  required?: boolean;
  error?: string;
  customer: string;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const [value, setValue] = useState(defaultValue);
  const digits = phoneDigits(value);
  const callable = /^\d{10}$/.test(digits);
  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={id} className="block text-[0.8125rem] font-semibold">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          name={name}
          type="tel"
          inputMode="numeric"
          autoComplete="off"
          placeholder={required ? "10 digits" : "Optional"}
          defaultValue={defaultValue}
          onInput={(e) => setValue(e.currentTarget.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className="field min-h-12 w-full min-w-0 flex-1 px-4 py-3 font-mono text-[0.9375rem] tabular-nums"
        />
        {callable ? (
          <a
            href={`tel:${digits}`}
            aria-label={`Call ${customer} on ${formatPhone(digits)}`}
            className="press inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-white hover:bg-ink/90"
          >
            <PhoneIcon width={18} height={18} />
          </a>
        ) : (
          <span aria-hidden="true" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted opacity-60">
            <PhoneIcon width={18} height={18} />
          </span>
        )}
      </div>
      <p id={errorId} role={error ? "alert" : undefined} className={cn("text-sm font-medium text-danger", !error && "hidden")}>
        {error}
      </p>
    </div>
  );
}

interface EditorFormProps {
  lead: LeadDTO;
  /** Branches the lead can be in: the actor's active branches plus its current one. */
  branches: BranchOption[];
  today: string;
  onDiscard: () => void;
  onSaved: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

function EditorForm({ lead, branches, today, onDiscard, onSaved, onDirtyChange }: EditorFormProps) {
  const form = useActionForm(leadEditSchema, (fd) => updateLeadAction(lead.id, fd));
  const ref = useRef<HTMLFormElement>(null);
  // The component remounts for each saved version of the lead, so this snapshot never goes stale.
  const [saved] = useState(() => baseline(lead));
  const [changes, setChanges] = useState(0);
  const [branchPicks, setBranchPicks] = useState(0);

  const recount = useCallback(() => {
    if (ref.current) setChanges(countChanges(ref.current, saved));
  }, [saved]);

  // React resets uncontrolled fields after an action; after a failed save they are refilled from the
  // submitted values, so re-measure once the new defaults are in place.
  useEffect(() => {
    recount();
  }, [form.error, branchPicks, recount]);

  useEffect(() => {
    if (form.successCount > 0) onSaved();
  }, [form.successCount, onSaved]);

  const dirty = changes > 0;
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);
  const value = (key: (typeof FIELDS)[number]) => form.value(key, saved[key]);
  const status = value("status");

  return (
    <form
      ref={ref}
      action={form.formAction}
      noValidate
      onInput={recount}
      onChange={recount}
      onSubmit={(e: FormEvent<HTMLFormElement>) => {
        if (!dirty) e.preventDefault();
      }}
      data-dirty={dirty || undefined}
      className="space-y-4"
    >
      <FormError error={form.error} />

      {/* min-w-0: a fieldset's default min-width is its content's, which let the chip row stretch the whole card. */}
      <fieldset className="min-w-0">
        <legend className="sr-only">Status</legend>
        {/*
          4-option segmented control, the selected option in Obsidian. Phones: one row that bleeds to the
          card edges and scrolls sideways like the list chips, so labels never truncate. From 768px the
          options share the full width equally.
        */}
        <div className="chip-row -mx-4 overflow-x-auto py-1 pl-4 sm:-mx-5 sm:pl-5 md:mx-0 md:overflow-visible md:pl-0">
          <div className="flex w-max gap-1.5 pr-4 sm:pr-5 md:w-full md:pr-0">
          {LEAD_STATUSES.map((s) => (
            <label
              key={s}
              className={cn(
                "press flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-1 rounded-full bg-surface-2 px-4 text-[0.8125rem] font-medium transition-colors hover:bg-surface-2-hover sm:text-sm md:min-w-0 md:flex-1 md:px-1",
                "has-[:checked]:bg-ink has-[:checked]:font-semibold has-[:checked]:text-white",
                "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)]",
              )}
            >
              <input type="radio" name="status" value={s} defaultChecked={status === s} className="peer sr-only" />
              <span className="whitespace-nowrap md:truncate">{s}</span>
            </label>
          ))}
          </div>
        </div>
      </fieldset>

      <TextField
        label="Customer name"
        name="customerName"
        autoComplete="off"
        required
        defaultValue={value("customerName")}
        error={form.fieldError("customerName")}
      />

      {/* Stacked on narrow phones: a half-width column can't show 10 digits next to the call button. */}
      <div className="grid grid-cols-1 items-start gap-3 min-[400px]:grid-cols-2 [&>*]:min-w-0">
        <PhoneInput
          label="Phone"
          name="customerPhone"
          required
          defaultValue={value("customerPhone")}
          error={form.fieldError("customerPhone")}
          customer={lead.customerName}
        />
        <PhoneInput
          label="Alternative phone"
          name="alternativePhone"
          defaultValue={value("alternativePhone")}
          error={form.fieldError("alternativePhone")}
          customer={lead.customerName}
        />
      </div>

      <div className="grid grid-cols-2 items-start gap-3 [&>*]:min-w-0">
        {/* Tappable when there is more than one branch to choose from (admins: all; others: assigned). */}
        <BranchField
          name="branchId"
          label="Branch"
          branches={branches}
          defaultValue={value("branchId")}
          error={form.fieldError("branchId")}
          onValueChange={() => setBranchPicks((n) => n + 1)}
        />
        <DateField
          label="Visit date"
          name="visitDate"
          required
          max={today}
          defaultValue={value("visitDate")}
          error={form.fieldError("visitDate")}
        />
      </div>

      <TextField
        label="Customer location"
        name="customerLocation"
        defaultValue={value("customerLocation")}
        error={form.fieldError("customerLocation")}
      />
      <TextAreaField
        label="Vehicle details"
        name="vehicleDetails"
        rows={3}
        placeholder="Model, variant, colour, exchange vehicle"
        defaultValue={value("vehicleDetails")}
        error={form.fieldError("vehicleDetails")}
      />

      {/* Appears only while something differs from the saved lead; sticks above the bottom navigation on phones. */}
      {dirty ? (
        <div
          className="sticky bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-20 -mx-1 flex items-center gap-2 rounded-full bg-ink p-1.5 text-white shadow-[var(--shadow-dock)] lg:bottom-4"
          role="region"
          aria-label="Unsaved changes"
        >
          <p className="min-w-0 flex-1 truncate pl-3 font-mono text-sm tabular-nums" aria-live="polite">
            {changes} {changes === 1 ? "change" : "changes"}
          </p>
          <Button variant="ghost" onClick={onDiscard} disabled={form.pending} className="text-zinc-300 hover:bg-white/10 hover:text-white">
            Discard
          </Button>
          <Button type="submit" disabled={form.pending}>
            {form.pending ? "Saving..." : "Save changes"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}

const COLLAPSE_KEY = "lead-details-collapsed";
const collapseListeners = new Set<() => void>();

/** Collapsed/expanded preference, remembered on this device and shared by every lead page. */
const collapsePreference = {
  subscribe(listener: () => void) {
    collapseListeners.add(listener);
    window.addEventListener("storage", listener);
    return () => {
      collapseListeners.delete(listener);
      window.removeEventListener("storage", listener);
    };
  },
  get: () => window.localStorage.getItem(COLLAPSE_KEY) === "1",
  // Server render and first paint: expanded.
  getServer: () => false,
  set(collapsed: boolean) {
    window.localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    for (const l of collapseListeners) l();
  },
};

interface LeadEditorProps {
  lead: LeadDTO;
  /** Branches the lead can be in: the actor's active branches plus its current one. */
  branches: BranchOption[];
  today: string;
}

/**
 * Customer details card as an always-editable form. Nothing is written until "Save changes";
 * the bar only shows while there are differences from the saved lead.
 * The title row collapses the card so the interactions are one glance away.
 */
export function LeadEditor({ lead, branches, today }: LeadEditorProps) {
  const [discards, setDiscards] = useState(0);
  const [justSaved, setJustSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const collapsed = useSyncExternalStore(collapsePreference.subscribe, collapsePreference.get, collapsePreference.getServer);
  const bodyId = useId();

  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 2500);
    return () => clearTimeout(t);
  }, [justSaved]);

  const onSaved = useCallback(() => setJustSaved(true), []);
  const onDiscard = useCallback(() => setDiscards((n) => n + 1), []);

  return (
    <section aria-labelledby="details-heading" className="rounded-[28px] bg-surface shadow-sheet">
      <h2 id="details-heading" className="font-display text-base font-bold">
        <button
          type="button"
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          onClick={() => collapsePreference.set(!collapsed)}
          className="press flex min-h-16 w-full items-center gap-3 rounded-[28px] px-5 py-3 text-left"
        >
          {/* Expanded: just the title (the form shows name and status). Collapsed: title + status tag. */}
          <span className="flex min-w-0 flex-1 items-center gap-2.5">
            <span className="truncate text-[1.0625rem] font-semibold leading-snug">Customer Details</span>
            {collapsed ? <StatusBadge status={lead.status} className="shrink-0" /> : null}
          </span>
          {justSaved ? (
            <span
              role="status"
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-status-purchased/12 px-2.5 py-1 text-xs font-semibold leading-4 text-status-purchased"
            >
              <CheckIcon aria-hidden="true" width={14} height={14} /> Saved
            </span>
          ) : collapsed && dirty ? (
            <span className="inline-flex shrink-0 items-center rounded-full bg-status-opened/12 px-2.5 py-1 text-xs font-semibold leading-4 text-status-opened">
              Unsaved
            </span>
          ) : null}
          <span aria-hidden="true" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2">
            <ChevronDownIcon width={18} height={18} className={cn("text-fg transition-transform duration-200", !collapsed && "rotate-180")} />
          </span>
        </button>
      </h2>
      {/* Kept mounted while collapsed so unsaved edits survive; `hidden` removes it from view and the tab order. */}
      <div id={bodyId} hidden={collapsed} className="lead-details-body px-4 pb-5 sm:px-5">
        {/* Remount on a new server version (after save) or on discard, so fields and the change count start clean. */}
        <EditorForm
          key={`${lead.updatedAt}:${discards}`}
          lead={lead}
          branches={branches}
          today={today}
          onDiscard={onDiscard}
          onSaved={onSaved}
          onDirtyChange={setDirty}
        />
      </div>
    </section>
  );
}