"use client";

import { useEffect } from "react";
import { createInteractionAction } from "@/lib/actions/leads";
import { interactionCreateSchema } from "@/lib/validators/entities";
import { Button } from "@/components/ui/button";
import { FormError, StampField, TextAreaField } from "@/components/forms/fields";
import { useActionForm } from "@/components/forms/use-action-form";

interface InteractionFormProps {
  leadId: string;
  /** Called after a successful save, e.g. to close the sheet. */
  onDone?: () => void;
}

export function InteractionForm({ leadId, onDone }: InteractionFormProps) {
  const form = useActionForm(interactionCreateSchema, createInteractionAction);
  useEffect(() => {
    if (form.successCount > 0) onDone?.();
  }, [form.successCount, onDone]);
  return (
    <form action={form.formAction} noValidate className="space-y-4" key={form.successCount}>
      <FormError error={form.error} />
      <input type="hidden" name="leadId" value={leadId} />
      {/* The server stamps the real time on save; this shows the current time. */}
      <StampField label="Date" />
      <TextAreaField
        label="Outcome"
        name="outcome"
        required
        hint="What was discussed and what happens next."
        placeholder="e.g. Called, wants a test drive on Saturday"
        defaultValue={form.value("outcome")}
        error={form.fieldError("outcome")}
      />
      <Button type="submit" className="w-full" disabled={form.pending}>
        {form.pending ? "Saving..." : "Save interaction"}
      </Button>
      <p role="status" className="sr-only">
        {form.successCount > 0 ? "Interaction added" : ""}
      </p>
    </form>
  );
}