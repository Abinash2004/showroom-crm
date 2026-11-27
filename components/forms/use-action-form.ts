"use client";

import { useActionState } from "react";
import { z } from "zod";
import type { ActionError, ActionResult } from "@/lib/errors";
import { formDataToObject } from "@/lib/validators/parse";
import { useBusySignal } from "@/components/layout/busy";

interface FormState {
  error: ActionError | null;
  values: Record<string, string[]>;
  successCount: number;
}

const INITIAL: FormState = { error: null, values: {}, successCount: 0 };

function snapshot(fd: FormData): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const key of new Set(fd.keys())) {
    if (/password/i.test(key)) continue; // never echo secrets back into the DOM
    out[key] = fd.getAll(key).filter((v): v is string => typeof v === "string");
  }
  return out;
}

/**
 * Validates with the same Zod schema as the server before submitting, then calls the Server Action.
 * Submitted values are kept in state because React resets uncontrolled fields after every form action.
 */
export function useActionForm(schema: z.ZodType, action: (fd: FormData) => Promise<ActionResult>) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(async (prev, fd) => {
    const values = snapshot(fd);
    const parsed = schema.safeParse(formDataToObject(fd));
    if (!parsed.success) {
      const flat = z.flattenError(parsed.error);
      return {
        ...prev,
        values,
        error: { code: "VALIDATION", message: "Please fix the highlighted fields.", fieldErrors: flat.fieldErrors as Record<string, string[]> },
      };
    }
    const result = await action(fd);
    if (result.ok) return { error: null, values: {}, successCount: prev.successCount + 1 };
    return { ...prev, values, error: result.error };
  }, INITIAL);
  useBusySignal(pending);

  return {
    formAction,
    pending,
    error: state.error,
    successCount: state.successCount,
    fieldError: (name: string): string | undefined => state.error?.fieldErrors?.[name]?.[0],
    value: (name: string, fallback = ""): string => state.values[name]?.[0] ?? fallback,
    values: (name: string, fallback: string[] = []): string[] => state.values[name] ?? fallback,
  };
}