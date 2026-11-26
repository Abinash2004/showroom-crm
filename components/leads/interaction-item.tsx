"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { updateInteractionAction } from "@/lib/actions/leads";
import { interactionUpdateSchema } from "@/lib/validators/entities";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { CalendarIcon, EditIcon, UserIcon } from "@/components/icons";
import { FormError, TextAreaField, TextField } from "@/components/forms/fields";
import { useActionForm } from "@/components/forms/use-action-form";
import { formatDate, toInputDate } from "@/lib/format";
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

/**
 * Interaction card: outcome clamped to two lines. Tapping the card opens the edit sheet;
 * "Show more" (only when text is cut off) opens a read-only sheet with the full outcome.
 * The edit button is stretched under the content so "Show more" can sit on top without nesting buttons.
 */
export function InteractionItem({ interaction, today }: { interaction: InteractionDTO; today: string }) {
  const [editOpen, setEditOpen] = useState(false);
  const [readOpen, setReadOpen] = useState(false);
  const closeEdit = useCallback(() => setEditOpen(false), []);
  const { ref, clamped } = useIsClamped<HTMLParagraphElement>();
  const date = formatDate(interaction.date);

  return (
    <li className="relative min-w-0 rounded-card bg-surface shadow-card">
      <Sheet
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Edit interaction"
        trigger={
          <button type="button" aria-haspopup="dialog" className="press absolute inset-0 rounded-card">
            <span className="sr-only">Edit interaction from {date}</span>
          </button>
        }
      >
        {editOpen ? <EditForm interaction={interaction} today={today} onDone={closeEdit} /> : null}
      </Sheet>

      {/* Content ignores taps so they fall through to the edit button underneath. */}
      <div className="pointer-events-none relative p-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <CalendarIcon aria-hidden="true" width={16} height={16} className="text-muted" />
          {date}
        </p>
        <p ref={ref} className="mt-2 line-clamp-2 whitespace-pre-wrap text-base leading-relaxed [overflow-wrap:anywhere]">
          {interaction.outcome}
        </p>
        <div className="mt-2 flex min-h-8 items-center justify-between gap-2">
          <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
            <UserIcon aria-hidden="true" width={14} height={14} className="shrink-0" />
            <span className="truncate">{interaction.actionByName}</span>
          </p>
          {clamped ? (
            <Sheet
              open={readOpen}
              onOpenChange={setReadOpen}
              title={date}
              description={`Logged by ${interaction.actionByName}`}
              trigger={
                <button
                  type="button"
                  aria-haspopup="dialog"
                  aria-label={`Show full outcome from ${date}`}
                  className="press pointer-events-auto -my-2 -mr-2 inline-flex min-h-12 shrink-0 items-center rounded-full px-3 text-sm font-semibold text-primary"
                >
                  Show more
                </button>
              }
            >
              <div className="space-y-5">
                <p className="whitespace-pre-wrap text-base leading-relaxed [overflow-wrap:anywhere]">{interaction.outcome}</p>
                <Button
                  variant="tonal"
                  className="w-full"
                  onClick={() => {
                    setReadOpen(false);
                    setEditOpen(true);
                  }}
                >
                  <EditIcon width={18} height={18} /> Edit interaction
                </Button>
              </div>
            </Sheet>
          ) : null}
        </div>
      </div>
    </li>
  );
}