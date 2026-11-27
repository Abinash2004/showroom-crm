"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { CalendarIcon, UserIcon } from "@/components/icons";
import { formatCardStamp, ordinal } from "@/lib/format";
import type { InteractionDTO } from "@/lib/types";

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
  /** 1-based position in the lead's history (oldest first) and the total, e.g. 2 of 3. */
  sequence: number;
  total: number;
}

/**
 * Interaction card, read-only (interactions are never edited):
 *   1. which interaction ("2nd interaction") with its date and time as a tag,
 *   2. the outcome (two lines),
 *   3. who logged it, with "Show more" when the outcome is cut off.
 * Rows are 12px apart.
 */
export function InteractionItem({ interaction, sequence, total }: InteractionItemProps) {
  const [readOpen, setReadOpen] = useState(false);
  const { ref, clamped } = useIsClamped<HTMLParagraphElement>();
  const stamp = formatCardStamp(interaction.date);

  const dateTag = (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-status-opened/12 px-2.5 py-1 text-xs font-semibold leading-4 tabular-nums text-status-opened">
      <CalendarIcon aria-hidden="true" width={12} height={12} className="shrink-0" />
      {stamp}
    </span>
  );

  return (
    <li className="flex h-full min-w-0 flex-col gap-3 rounded-[22px] bg-surface-2 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="min-w-0 truncate text-[1.0625rem] font-semibold leading-6">
          {ordinal(sequence)} interaction
          <span className="sr-only"> of {total}</span>
        </h3>
        {dateTag}
      </div>

      <p ref={ref} className="line-clamp-2 whitespace-pre-wrap text-sm leading-relaxed text-fg/80 [overflow-wrap:anywhere]">
        {interaction.outcome}
      </p>

      {/* mt-auto: in a desktop row the cards share a height, so this line stays at the bottom. */}
      <div className="mt-auto flex min-h-8 items-center justify-between gap-3">
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
                {dateTag}
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
                aria-label={`Show full outcome from ${stamp}`}
                className="press inline-flex h-8 shrink-0 items-center rounded-full bg-ink px-3.5 text-xs font-semibold text-white hover:bg-ink/90"
              >
                Show more
              </button>
            }
          >
            {/* Outcome on a pebble panel, scrolling inside the sheet when it is very long. */}
            <p className="soft-scroll max-h-[45dvh] overflow-y-auto whitespace-pre-wrap rounded-[22px] bg-surface-2 p-4 text-[0.9375rem] leading-relaxed text-fg/90 [overflow-wrap:anywhere]">
              {interaction.outcome}
            </p>
          </Sheet>
        ) : null}
      </div>
    </li>
  );
}
