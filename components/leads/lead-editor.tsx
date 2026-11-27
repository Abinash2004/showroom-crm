"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { FormEvent } from "react";
import { updateLeadAction } from "@/lib/actions/leads";
import { CheckIcon, ChevronDownIcon, PhoneIcon } from "@/components/icons";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { FormError, TextAreaField, TextField } from "@/components/forms/fields";
import { useActionForm } from "@/components/forms/use-action-form";
import { cn } from "@/lib/cn";
import { LEAD_STATUSES } from "@/lib/constants";
import { formatCardStamp, formatPhone } from "@/lib/format";
import type { LeadDTO } from "@/lib/types";
import { leadEditSchema } from "@/lib/validators/entities";

/** The only editable fields; everything else is fixed when the lead is created. */
const FIELDS = ["status", "customerLocation", "vehicleDetails"] as const;
type Snapshot = Record<(typeof FIELDS)[number], string>;

const baseline = (lead: LeadDTO): Snapshot => ({
  status: lead.status,
  customerLocation: lead.customerLocation ?? "",
  vehicleDetails: lead.vehicleDetails ?? "",
});

/**
 * Compare as the form sees it: a textarea always reports line breaks as "\n", while saved text may hold
 * "\r\n". Without this, multi-line vehicle details count as a change before anything is edited.
 */
const normalize = (v: string): string => v.replace(/\r\n?/g, "\n").trim();

/** Number of fields that differ from the saved lead. O(fields). Whitespace-only edits don't count. */
function countChanges(form: HTMLFormElement, saved: Snapshot): number {
  const fd = new FormData(form);
  let n = 0;
  for (const key of FIELDS) {
    const raw = fd.get(key);
    if (normalize(typeof raw === "string" ? raw : "") !== normalize(saved[key])) n++;
  }
  return n;
}

/**
 * One fixed detail as a tile: small label on top, value underneath, optional call button on the right.
 * Every tile has the same height and padding, so the grid lines up in rows and columns.
 */
function DetailTile({ label, children, call, className }: { label: string; children: React.ReactNode; call?: { phone: string; label: string }; className?: string }) {
  return (
    <div className={cn("flex min-h-16 min-w-0 items-center gap-3 rounded-2xl bg-surface-2 px-4 py-2.5", className)}>
      <div className="min-w-0 flex-1">
        <dt className="text-xs font-medium text-muted">{label}</dt>
        <dd className="mt-0.5 truncate text-[0.9375rem] font-semibold leading-6">{children}</dd>
      </div>
      {call ? (
        <a
          href={`tel:${call.phone}`}
          aria-label={call.label}
          className="press inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-white hover:bg-ink/90"
        >
          <PhoneIcon width={16} height={16} />
        </a>
      ) : null}
    </div>
  );
}

/**
 * Fixed details, set when the lead was created and never editable: name across the full width, then
 * phone | alternative phone and branch | visit date in two equal columns (one column on phones).
 */
function LeadSummary({ lead, branchLocation }: { lead: LeadDTO; branchLocation?: string }) {
  const phone = formatPhone(lead.customerPhone);
  const alt = lead.alternativePhone ? formatPhone(lead.alternativePhone) : null;
  return (
    <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <DetailTile label="Customer name" className="sm:col-span-2">
        {lead.customerName}
      </DetailTile>
      <DetailTile label="Phone" call={{ phone: lead.customerPhone, label: `Call ${lead.customerName} on ${phone}` }}>
        <span className="tabular-nums tracking-wide">{phone}</span>
      </DetailTile>
      <DetailTile
        label="Alternative phone"
        call={alt && lead.alternativePhone ? { phone: lead.alternativePhone, label: `Call ${lead.customerName} on ${alt}` } : undefined}
      >
        {alt ? <span className="tabular-nums tracking-wide">{alt}</span> : <span className="font-normal text-muted">Not given</span>}
      </DetailTile>
      <DetailTile label="Branch">
        {lead.branchName}
        {branchLocation ? <span className="font-normal text-muted"> · {branchLocation}</span> : null}
      </DetailTile>
      <DetailTile label="Visit date">
        <span className="tabular-nums">{formatCardStamp(lead.visitDate)}</span>
      </DetailTile>
    </dl>
  );
}
interface EditorFormProps {
  lead: LeadDTO;
  branchLocation?: string;
  onDiscard: () => void;
  onSaved: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

function EditorForm({ lead, branchLocation, onDiscard, onSaved, onDirtyChange }: EditorFormProps) {
  const form = useActionForm(leadEditSchema, (fd) => updateLeadAction(lead.id, fd));
  const ref = useRef<HTMLFormElement>(null);
  // The component remounts for each saved version of the lead, so this snapshot never goes stale.
  const [saved] = useState(() => baseline(lead));
  const [changes, setChanges] = useState(0);

  const recount = useCallback(() => {
    if (ref.current) setChanges(countChanges(ref.current, saved));
  }, [saved]);

  // React resets uncontrolled fields after an action; after a failed save they are refilled from the
  // submitted values, so re-measure once the new defaults are in place.
  useEffect(() => {
    recount();
  }, [form.error, recount]);

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
        {/* Phones: one row that bleeds to the card edges and scrolls sideways. From 768px: equal widths. */}
        <div className="chip-row -mx-4 overflow-x-auto py-1 pl-4 sm:-mx-5 sm:pl-5 md:mx-0 md:overflow-visible md:pl-0">
          <div className="flex w-max gap-1.5 pr-4 sm:pr-5 md:w-full md:pr-0">
            {LEAD_STATUSES.map((s) => (
              <label
                key={s}
                className={cn(
                  "press flex min-h-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface-2 px-4 text-[0.8125rem] font-medium transition-colors hover:bg-surface-2-hover sm:text-sm md:min-w-0 md:flex-1 md:px-1",
                  "has-[:checked]:bg-ink has-[:checked]:font-semibold has-[:checked]:text-white",
                  "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)]",
                )}
              >
                <input type="radio" name="status" value={s} defaultChecked={status === s} className="sr-only" />
                <span className="whitespace-nowrap md:truncate">{s}</span>
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      <LeadSummary lead={lead} branchLocation={branchLocation} />

      <TextField
        label="Customer location"
        name="customerLocation"
        placeholder="Town, locality or city"
        defaultValue={value("customerLocation")}
        error={form.fieldError("customerLocation")}
      />
      <TextAreaField
        label="Vehicle details"
        name="vehicleDetails"
        rows={2}
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
          <p className="min-w-0 flex-1 truncate pl-3 text-sm tabular-nums" aria-live="polite">
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

/**
 * Customer details card. Name, phones, branch and visit date are fixed at creation and shown read-only;
 * status, customer location and vehicle details are edited inline and saved with the Save bar.
 * The title row collapses the card so the interactions are one glance away.
 */
export function LeadEditor({ lead, branchLocation }: { lead: LeadDTO; branchLocation?: string }) {
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
          className="press flex min-h-14 w-full items-center gap-3 rounded-[28px] px-5 py-2 text-left"
        >
          {/* Expanded: just the title (the form shows the status). Collapsed: title + status tag. */}
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
      <div id={bodyId} hidden={collapsed} className="lead-details-body px-4 pb-4 sm:px-5">
        {/* Remount on a new server version (after save) or on discard, so fields and the change count start clean. */}
        <EditorForm
          key={`${lead.updatedAt}:${discards}`}
          lead={lead}
          branchLocation={branchLocation}
          onDiscard={onDiscard}
          onSaved={onSaved}
          onDirtyChange={setDirty}
        />
      </div>
    </section>
  );
}
