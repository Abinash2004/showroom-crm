"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { updateInteractionAction } from "@/lib/actions/leads";
import { interactionUpdateSchema } from "@/lib/validators/entities";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { CalendarIcon, UserIcon } from "@/components/icons";
import { FormError, TextAreaField, TextField } from "@/components/forms/fields";
import { useActionForm } from "@/components/forms/use-action-form";
import { formatDate, ordinal, toInputDate } from "@/lib/format";
import type { InteractionDTO } from "@/lib/types";

function EditForm({ interaction, today, onDone }: { interaction: InteractionDTO; today: string; onDone: () => void }) {
  const form = useActionForm(interactionUpdateSchema, (fd) => updateInteractionAction(interaction.leadId, fd));
  useEffect(() => {
    if (form.successCount > 0) onDone();
  }, [form.successCount, onDone]);
  return (
    <form action={form.formAction} noValidate className="space-y-4">
      <FormError error={form.error} />
      <input type="hidden" name="id" value={interaction.id} />
      <TextField
        label="Date"
        name="date"
        type="date"
        required
        max={today}
        defaultValue={form.value("date", toInputDate(interaction.date))}
        error={form.fieldError("date")}
      />
      <TextAreaField
        label="Outcome"
        name="outcome"
        required
        rows={6}
        className="soft-scroll text-[15px] leading-relaxed"
        defaultValue={form.value("outcome", interaction.outcome)}
        error={form.fieldError("outcome")}
      />
      <Button type="submit" className="w-full" disabled={form.pending}>
        {form.pending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}

/** True when the clamped element hides part of its text. Re-measured on resize. */
function useIsClamped<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [clamped, setClamped] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setClamped(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, clamped };
}

interface InteractionItemProps {
  interaction: InteractionDTO;
  today: string;
  /** 1-based position in the lead's history (oldest first) and the total, e.g. 2 of 3. */
  sequence: number;
  total: number;
}

/**
 * Interaction card, same layout as the follow-up cards:
 *   1. which interaction ("2nd interaction") with its date as a tag,
 *   2. the outcome (two lines),
 *   3. who logged it, with "Show more" as a chip when the outcome is cut off.
 * Tapping the card opens the edit sheet. The edit button is stretched under the content so
 * "Show more" can sit on top without nesting buttons.
 */
export function InteractionItem({ interaction, today, sequence, total }: InteractionItemProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [readOpen, setReadOpen] = useState(false);
  const closeEdit = useCallback(() => setEditOpen(false), []);
  const { ref, clamped } = useIsClamped<HTMLParagraphElement>();
  const date = formatDate(interaction.date);

  return (
    <li className="relative h-full min-w-0 rounded-[22px] bg-surface-2 transition-colors hover:bg-surface-2-hover">
      <Sheet
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Edit interaction"
        description={`${ordinal(sequence)} interaction · logged by ${interaction.actionByName}`}
        trigger={
          <button type="button" aria-haspopup="dialog" className="press absolute inset-0 rounded-[22px]">
            <span className="sr-only">Edit interaction from {date}</span>
          </button>
        }
      >
        {editOpen ? <EditForm interaction={interaction} today={today} onDone={closeEdit} /> : null}
      </Sheet>

      {/* Content ignores taps so they fall through to the edit button underneath. */}
      <div className="pointer-events-none relative flex h-full flex-col p-4">
        {/* 1. Which interaction + date tag */}
        <div className="flex items-center justify-between gap-3">
          <h3 className="min-w-0 truncate text-[17px] font-semibold leading-snug">
            {ordinal(sequence)} interaction
            <span className="sr-only"> of {total}</span>
          </h3>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-status-opened/12 px-2.5 py-1 text-xs font-semibold leading-4 tabular-nums text-status-opened">
            <CalendarIcon aria-hidden="true" width={12} height={12} className="shrink-0" />
            {date}
          </span>
        </div>

        {/* 2. Outcome */}
        <p ref={ref} className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm leading-relaxed text-fg/80 [overflow-wrap:anywhere]">
          {interaction.outcome}
        </p>

        {/* 3. Logged by + Show more */}
        <div className="mt-auto flex min-h-9 items-end justify-between gap-3 pt-4">
          <p className="flex min-w-0 items-center gap-1 text-xs text-muted">
            <UserIcon aria-hidden="true" width={13} height={13} className="shrink-0" />
            <span className="truncate">{interaction.actionByName}</span>
          </p>
          {clamped ? (
            <Sheet
              open={readOpen}
              onOpenChange={setReadOpen}
              title={`${ordinal(sequence)} interaction`}
              meta={
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-status-opened/12 px-2.5 py-1 text-xs font-semibold leading-4 tabular-nums text-status-opened">
                    <CalendarIcon aria-hidden="true" width={12} height={12} className="shrink-0" />
                    {date}
                  </span>
                  <span className="inline-flex min-w-0 items-center gap-1 text-xs text-muted">
                    <UserIcon aria-hidden="true" width={13} height={13} className="shrink-0" />
                    <span className="truncate">{interaction.actionByName}</span>
                  </span>
                </div>
              }
              trigger={
                <button
                  type="button"
                  aria-haspopup="dialog"
                  aria-label={`Show full outcome from ${date}`}
                  className="press pointer-events-auto inline-flex h-9 shrink-0 items-center rounded-full bg-ink px-3.5 text-xs font-semibold text-white hover:bg-ink/90"
                >
                  Show more
                </button>
              }
            >
              <div className="space-y-4">
                {/* Outcome on a pebble panel, scrolling inside the sheet when it is very long. */}
                <p className="soft-scroll max-h-[45dvh] overflow-y-auto whitespace-pre-wrap rounded-[22px] bg-surface-2 p-4 text-[15px] leading-relaxed text-fg/90 [overflow-wrap:anywhere]">
                  {interaction.outcome}
                </p>
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => {
                    setReadOpen(false);
                    setEditOpen(true);
                  }}
                >
                  Edit interaction
                </Button>
              </div>
            </Sheet>
          ) : null}
        </div>
      </div>
    </li>
  );
}