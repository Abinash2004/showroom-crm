"use client";

import { useState, useTransition } from "react";
import { useBusySignal } from "@/components/layout/busy";
import { setBranchActiveAction, setUserActiveAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";

interface ToggleActiveProps {
  kind: "branch" | "user";
  id: string;
  name: string;
  isActive: boolean;
}

const chip =
  "press inline-flex h-9 shrink-0 items-center rounded-full bg-ink px-3.5 text-xs font-semibold transition-colors hover:bg-ink/90 disabled:opacity-60";

/**
 * Dark chip action; the text colour carries the meaning: red to deactivate, green to activate.
 * Deactivating a user signs them out at once, so it asks first in an in-app confirmation sheet.
 */
export function ToggleActive({ kind, id, name, isActive }: ToggleActiveProps) {
  const [pending, startTransition] = useTransition();
  useBusySignal(pending);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const needsConfirm = isActive && kind === "user";

  function run() {
    const fd = new FormData();
    fd.set("id", id);
    if (!isActive) fd.set("isActive", "on");
    startTransition(async () => {
      const result = await (kind === "branch" ? setBranchActiveAction(fd) : setUserActiveAction(fd));
      setError(result.ok ? null : result.error.message);
      setConfirmOpen(false);
    });
  }

  const label = pending ? "Saving..." : isActive ? "Deactivate" : "Activate";
  const tone = isActive ? "text-[var(--danger-on-ink)]" : "text-[var(--accent-on-ink)]";
  const aria = `${isActive ? "Deactivate" : "Activate"} ${name}`;

  return (
    <div className="flex flex-col items-end">
      {needsConfirm ? (
        <Sheet
          open={confirmOpen}
          onOpenChange={(next) => {
            if (!pending) setConfirmOpen(next);
          }}
          title={`Deactivate ${name}?`}
          description="They will be signed out immediately and can't sign in until reactivated."
          trigger={
            <button type="button" disabled={pending} aria-label={aria} aria-haspopup="dialog" className={cn(chip, tone)}>
              {label}
            </button>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <Button variant="tonal" onClick={() => setConfirmOpen(false)} disabled={pending}>
              Cancel
            </Button>
            {/* `!`: the ink variant sets text-white; the red has to win over it. */}
            <Button variant="ink" onClick={run} disabled={pending} className="text-[var(--danger-on-ink)]!">
              {pending ? "Deactivating..." : "Deactivate"}
            </Button>
          </div>
        </Sheet>
      ) : (
        <button type="button" onClick={run} disabled={pending} aria-label={aria} className={cn(chip, tone)}>
          {label}
        </button>
      )}
      <p role="alert" className={error ? "mt-1 text-right text-xs font-medium text-danger" : "hidden"}>
        {error}
      </p>
    </div>
  );
}
