"use client";

import { createLeadAction } from "@/lib/actions/leads";
import { leadCreateSchema } from "@/lib/validators/entities";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@/components/icons";
import { FormError, TextAreaField, TextField } from "@/components/forms/fields";
import { useActionForm } from "@/components/forms/use-action-form";
import type { BranchDTO } from "@/lib/types";
import { BranchField } from "./branch-field";

/** New-lead form. On success the server action redirects to the new lead. Editing happens inline on the lead page. */
export function LeadForm({ branches, today }: { branches: BranchDTO[]; today: string }) {
  const form = useActionForm(leadCreateSchema, createLeadAction);
  return (
    <form action={form.formAction} noValidate className="space-y-4">
      <FormError error={form.error} />
      {/* Paired fields share a row 50/50; min-w-0 lets the narrow columns shrink below their content width. */}
      <div className="grid grid-cols-2 items-start gap-3 [&>*]:min-w-0">
        <BranchField
          name="branchId"
          label="Branch"
          branches={branches.map((b) => ({ id: b.id, name: b.name, location: b.location, isActive: b.isActive }))}
          defaultValue={form.value("branchId")}
          error={form.fieldError("branchId")}
        />
        <TextField
          label="Visit date"
          name="visitDate"
          type="date"
          required
          max={today}
          defaultValue={form.value("visitDate", today)}
          error={form.fieldError("visitDate")}
        />
      </div>
      <TextField
        label="Customer name"
        name="customerName"
        autoComplete="off"
        required
        placeholder="Full name of showroom visitor"
        defaultValue={form.value("customerName")}
        error={form.fieldError("customerName")}
      />
      <div className="grid grid-cols-2 items-start gap-3 [&>*]:min-w-0">
        <TextField
          label="Phone"
          name="customerPhone"
          type="tel"
          inputMode="numeric"
          placeholder="10 digits"
          autoComplete="off"
          required
          defaultValue={form.value("customerPhone")}
          error={form.fieldError("customerPhone")}
        />
        <TextField
          label="Alternative phone"
          name="alternativePhone"
          type="tel"
          inputMode="numeric"
          placeholder="10 digits"
          autoComplete="off"
          defaultValue={form.value("alternativePhone")}
          error={form.fieldError("alternativePhone")}
        />
      </div>
      <TextField
        label="Customer location"
        name="customerLocation"
        placeholder="Town, locality or city"
        defaultValue={form.value("customerLocation")}
        error={form.fieldError("customerLocation")}
      />
      <TextAreaField
        label="Vehicle details"
        name="vehicleDetails"
        placeholder="e.g. Yamaha MT-15, Racing Blue, finance required"
        hint="Model, variant, colour, exchange vehicle or anything else the customer asked about."
        defaultValue={form.value("vehicleDetails")}
        error={form.fieldError("vehicleDetails")}
      />
      <Button type="submit" className="w-full" disabled={form.pending}>
        <PlusIcon width={18} height={18} aria-hidden="true" />
        {form.pending ? "Saving..." : "Create lead"}
      </Button>
    </form>
  );
}
