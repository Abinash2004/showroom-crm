"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { ChatIcon, CloseIcon } from "@/components/icons";
import { useBusySignal } from "@/components/layout/busy";
import { cn } from "@/lib/cn";
import { INTERACTION_BUCKETS } from "@/lib/constants";
import type { InteractionBucket } from "@/lib/constants";
import { buildHref } from "@/lib/url";

const LABELS: Record<InteractionBucket, string> = { 0: "0", 1: "1", 2: "2", more: "2+" };
const SPOKEN: Record<InteractionBucket, string> = {
  0: "no interactions",
  1: "exactly 1 interaction",
  2: "exactly 2 interactions",
  more: "more than 2 interactions",
};
const STOPS = INTERACTION_BUCKETS.length;
/** Movement (px) before a press counts as a slide instead of a tap. */
const DRAG_SLOP = 6;

interface InteractionDialProps {
  /** Current filter from the URL; undefined = off. */
  value: InteractionBucket | undefined;
  /** Other active filters, kept when this one changes. */
  base: Record<string, string | undefined>;
  path?: string;
}

/**
 * Interaction-count filter as a "focus dial", same size and colours as the branch chip.
 * At rest: icon + "Count", only as wide as that. Tap: the pill grows into a 4-stop dial (0, 1, 2, 2+) with a
 * green lens on the chosen stop, and the icon turns into a cross. Tapping the cross is the only way back to rest
 * (filter cleared). Tapping a number moves the lens there; sliding moves it with the finger and snaps on
 * release (one navigation per slide).
 *
 * One element for both states, driven only by pointer events: swapping elements on tap would let the same
 * tap's click land on the new element and reopen the dial.
 */
export function InteractionDial({ value, base, path = "/leads" }: InteractionDialProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useBusySignal(pending);

  // Optimistic state until the server render with the new filter arrives; reset when the URL value changes.
  const [seen, setSeen] = useState(value);
  const [local, setLocal] = useState<{ open: boolean; index: number } | null>(null);
  if (value !== seen) {
    setSeen(value);
    setLocal(null);
  }
  const open = local?.open ?? value !== undefined;
  const index = local?.index ?? Math.max(0, value ? INTERACTION_BUCKETS.indexOf(value) : 0);

  const trackRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLSpanElement>(null);
  // `onIcon`: the press started on the icon tile (the cross when open), which never slides.
  const press = useRef<{ x: number; dragging: boolean; onIcon: boolean } | null>(null);
  // Lens centre and stop width in px while sliding (null = resting on `index`).
  const [drag, setDrag] = useState<{ center: number; step: number } | null>(null);

  function commit(nextOpen: boolean, nextIndex: number) {
    setLocal({ open: nextOpen, index: nextIndex });
    const bucket = nextOpen ? INTERACTION_BUCKETS[nextIndex] : undefined;
    startTransition(() => {
      router.replace(buildHref(path, { ...base, interactions: bucket }), { scroll: false });
    });
  }

  /** Lens centre clamped to the first/last stop centres, and the stop nearest to it. O(1). */
  function measure(clientX: number): { center: number; step: number; nearest: number } | null {
    const track = trackRef.current;
    if (!track) return null;
    const rect = track.getBoundingClientRect();
    const step = rect.width / STOPS;
    const center = Math.min(Math.max(clientX - rect.left, step / 2), rect.width - step / 2);
    return { center, step, nearest: Math.round((center - step / 2) / step) };
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    press.current = { x: e.clientX, dragging: false, onIcon: Boolean(iconRef.current?.contains(e.target as Node)) };
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const p = press.current;
    if (!p || !open || p.onIcon) return;
    if (!p.dragging && Math.abs(e.clientX - p.x) < DRAG_SLOP) return;
    p.dragging = true;
    const m = measure(e.clientX);
    if (m) setDrag({ center: m.center, step: m.step });
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const p = press.current;
    press.current = null;
    if (!p) return;
    if (!p.dragging) {
      if (!open) commit(true, 0); // tap at rest: open at 0
      else if (p.onIcon) commit(false, index); // tap on the cross: back to rest, filter cleared
      else {
        const m = measure(e.clientX); // tap on a number: move the lens there
        if (m && m.nearest !== index) commit(true, m.nearest);
      }
      return;
    }
    const m = measure(e.clientX);
    setDrag(null);
    if (m && m.nearest !== index) commit(true, m.nearest);
  }

  function onPointerCancel() {
    press.current = null;
    setDrag(null);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!open) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        commit(true, 0);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      commit(false, index);
      return;
    }
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 };
    let next: number | undefined;
    if (e.key in moves) next = index + (moves[e.key] ?? 0);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = STOPS - 1;
    if (next === undefined) return;
    e.preventDefault();
    next = Math.min(Math.max(next, 0), STOPS - 1);
    if (next !== index) commit(true, next);
  }

  // Stop in focus: the one under the lens (live while sliding).
  const focused = drag ? Math.round((drag.center - drag.step / 2) / drag.step) : index;
  const lensLeft = drag ? `${drag.center}px` : `${((index + 0.5) / STOPS) * 100}%`;
  const current = INTERACTION_BUCKETS[index] ?? "0";

  return (
    <div
      role={open ? "slider" : "button"}
      tabIndex={0}
      aria-label={open ? "Interaction count. Use arrow keys to change, Escape to clear" : "Filter by interaction count"}
      aria-valuemin={open ? 0 : undefined}
      aria-valuemax={open ? STOPS - 1 : undefined}
      aria-valuenow={open ? index : undefined}
      aria-valuetext={open ? `Leads with ${SPOKEN[current]}` : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onKeyDown={onKeyDown}
      // pan-y: vertical page scroll still works; horizontal movement drives the dial.
      // Width: just fits icon + "Count" at rest (6.75rem), and grows to the dial (12rem) on open. Explicit
      // widths so the change can animate; overflow-hidden clips the content while it grows or shrinks.
      className={cn(
        "flex h-12 shrink-0 cursor-pointer touch-pan-y select-none items-center gap-2 overflow-hidden rounded-full bg-ink py-1.5 pl-1.5 text-white",
        "transition-[width,padding,background-color] duration-300 ease-[var(--ease-standard)] hover:bg-ink/90",
        open ? "w-48 pr-1.5" : "w-[6.75rem] pr-3.5",
      )}
    >
      {/* Same tile as the branch chip (white icon on a light circle). Open, the icon turns into the close cross. */}
      <span ref={iconRef} aria-hidden="true" className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15">
        <ChatIcon width={18} height={18} className={cn("absolute transition-[opacity,rotate,scale] duration-300", open && "rotate-90 scale-50 opacity-0")} />
        <CloseIcon width={18} height={18} className={cn("absolute transition-[opacity,rotate,scale] duration-300", !open && "-rotate-90 scale-50 opacity-0")} />
      </span>

      {open ? (
        <div ref={trackRef} aria-hidden="true" className="dial-track relative h-9 min-w-0 flex-1 rounded-full bg-white/[0.07]">
          {/* The lens: rests on the chosen stop and follows the finger while sliding. */}
          <span
            style={{ left: lensLeft }}
            className={cn(
              "dial-lens absolute top-1/2 h-7 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent-on-ink)]",
              !drag && "transition-[left] duration-200 ease-[var(--ease-standard)]",
            )}
          />
          <div className="relative grid h-full grid-cols-4">
            {INTERACTION_BUCKETS.map((b, i) => (
              <span
                key={b}
                className={cn(
                  "flex items-center justify-center text-sm tabular-nums transition-colors duration-150",
                  i === focused ? "font-semibold text-ink" : "font-medium text-zinc-200",
                )}
              >
                {LABELS[b]}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <span className="animate-[fade-in_220ms_ease-out] whitespace-nowrap text-sm font-semibold text-[var(--accent-on-ink)]">Count</span>
      )}
    </div>
  );
}
