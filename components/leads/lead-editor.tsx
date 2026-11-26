"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { FormEvent } from "react";
import { updateLeadAction } from "@/lib/actions/leads";
import { CheckIcon, ChevronDownIcon, PhoneIcon } from "@/components/icons";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { FormError, TextAreaField, TextField } from "@/components/forms/fields";
import { useActionForm } from "@/components/forms/use-action-form";
import { CHIP_ITEM, CHIP_LIST, CHIP_SCROLLER } from "@/lib/chip-classes";
import { cn } from "@/lib/cn";
import { LEAD_STATUSES } from "@/lib/constants";
import { formatPhone, toInputDate } from "@/lib/format";
import type { LeadDTO } from "@/lib/types";
import { leadEditSchema } from "@/lib/validators/entities";
import { BranchField } from "./branch-field";
import type { BranchOption } from "./branch-list-sheet";
import { chipClass } from "./chip-link";

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

/** Phone input with a call button inside it. Calls whatever is typed once it is a full 10-digit number. */
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
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type="tel"
          inputMode="numeric"
          autoComplete="off"
          placeholder="10 digits"
          defaultValue={defaultValue}
          onInput={(e) => setValue(e.currentTarget.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "min-h-12 w-full rounded-xl border bg-surface py-3 pl-3 pr-12 text-base tabular-nums text-fg placeholder:text-muted",
            error ? "border-danger" : "border-line",
          )}
        />
        {callable ? (
          <a
            href={`tel:${digits}`}
            aria-label={`Call ${customer} on ${formatPhone(digits)}`}
            className="press absolute right-1 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-lg bg-primary-soft text-on-primary-soft"
          >
            <PhoneIcon width={18} height={18} />
          </a>
        ) : (
          <span aria-hidden="true" className="pointer-events-none absolute right-1 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center text-muted opacity-40">
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
        <div className={CHIP_SCROLLER}>
          <ul className={CHIP_LIST}>
            {LEAD_STATUSES.map((s) => (
              <li key={s} className={CHIP_ITEM}>
                <label
                  className={cn(
                    chipClass(false, "solid"),
                    "cursor-pointer gap-1.5",
                    "has-[:checked]:border-transparent has-[:checked]:bg-primary has-[:checked]:text-on-primary",
                    "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)]",
                  )}
                >
                  <input type="radio" name="status" value={s} defaultChecked={status === s} className="peer sr-only" />
                  <CheckIcon aria-hidden="true" width={16} height={16} className="hidden peer-checked:block" />
                  {s}
                </label>
              </li>
            ))}
          </ul>
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

      <div className="grid grid-cols-2 items-start gap-3 [&>*]:min-w-0">
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
        <TextField
          label="Visit date"
          name="visitDate"
          type="date"
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
          className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)] z-20 -mx-2 flex items-center gap-2 rounded-2xl border border-line bg-surface p-2 shadow-sheet md:bottom-4"
          role="region"
          aria-label="Unsaved changes"
        >
          <p className="min-w-0 flex-1 truncate pl-2 text-sm font-medium" aria-live="polite">
            {changes} {changes === 1 ? "change" : "changes"}
          </p>
          <Button variant="outline" onClick={onDiscard} disabled={form.pending}>
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
    <section aria-labelledby="details-heading" className="rounded-card bg-surface shadow-card">
      <h2 id="details-heading" className="text-base font-semibold">
        <button
          type="button"
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          onClick={() => collapsePreference.set(!collapsed)}
          className="press flex min-h-14 w-full items-center gap-3 rounded-card px-4 py-2 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="block">Customer details</span>
            {/* Collapsed: a one-line summary so it's still clear whose lead this is. */}
            {collapsed ? (
              <span className="mt-0.5 flex min-w-0 items-center gap-2 text-sm font-normal text-muted">
                <span className="truncate">{lead.customerName}</span>
                <StatusBadge status={lead.status} className="shrink-0" />
              </span>
            ) : null}
          </span>
          {justSaved ? (
            <span role="status" className="flex shrink-0 items-center gap-1 text-sm font-medium text-on-success-soft">
              <CheckIcon aria-hidden="true" width={16} height={16} /> Saved
            </span>
          ) : collapsed && dirty ? (
            <span className="shrink-0 rounded-full bg-warn-soft px-2.5 py-0.5 text-xs font-semibold text-on-warn-soft">Unsaved</span>
          ) : null}
          <ChevronDownIcon
            aria-hidden="true"
            width={22}
            height={22}
            className={cn("shrink-0 text-muted transition-transform duration-200", !collapsed && "rotate-180")}
          />
        </button>
      </h2>
      {/* Kept mounted while collapsed so unsaved edits survive; `hidden` removes it from view and the tab order. */}
      <div id={bodyId} hidden={collapsed} className="lead-details-body px-4 pb-4">
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