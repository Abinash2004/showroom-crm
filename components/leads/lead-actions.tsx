"use client";

import { useCallback, useRef, useState } from "react";
import { PlusIcon } from "@/components/icons";
import { buttonClass } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import { InteractionForm } from "./interaction-form";

/**
 * "Log interaction": a floating button above the bottom navigation on phones (always within thumb reach),
 * an inline button beside the Interactions heading from 768px up. Opens the form in a sheet with the
 * outcome box focused, so the keyboard is already up.
 */
export function LogInteractionSheet({ leadId, today }: { leadId: string; today: string }) {
  const [open, setOpen] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      title="Log interaction"
      description="Record what happened in this follow-up."
      onOpenAutoFocus={(e) => {
        e.preventDefault();
        body.current?.querySelector("textarea")?.focus();
      }}
      trigger={
        <button
          type="button"
          className={cn(
            buttonClass("primary"),
            "log-fab fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-30 h-14 px-6 shadow-sheet",
            "md:static md:h-auto md:px-5 md:shadow-none",
          )}
        >
          <PlusIcon /> Log interaction
        </button>
      }
    >
      <div ref={body}>{open ? <InteractionForm leadId={leadId} today={today} onDone={close} /> : null}</div>
    </Sheet>
  );
}
