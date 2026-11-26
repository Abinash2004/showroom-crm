"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { KeyboardEvent, TouchEvent } from "react";
import { BackIcon, CalendarIcon, Spinner } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import { formatShortDate } from "@/lib/format";
import { describeDateRange, isoMonth, monthGrid, pickRangeDay, shiftIsoDate, shiftMonth } from "@/lib/lead-filters";
import type { DayRange } from "@/lib/lead-filters";
import { buildHref } from "@/lib/url";
import { chipClass } from "./chip-link";

const monthFmt = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
const dayFmt = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const WEEKDAYS = [
  ["S", "Sunday"],
  ["M", "Monday"],
  ["T", "Tuesday"],
  ["W", "Wednesday"],
  ["T", "Thursday"],
  ["F", "Friday"],
  ["S", "Saturday"],
] as const;
const KEY_STEP: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
const SWIPE_PX = 50;
const DAY_MS = 86_400_000;

const toDate = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const dayCount = (from: string, to: string) => Math.round((toDate(to).getTime() - toDate(from).getTime()) / DAY_MS) + 1;

interface DateRangeSheetProps {
  /** Kept as-is when applying (search, status, branch). */
  base: Record<string, string | undefined>;
  from?: string;
  to?: string;
  /** Today in the showroom timezone (ISO day). Future days are disabled. */
  today: string;
  /** True when the current range is not one of the quick presets, so the chip shows the range. */
  active: boolean;
  /** List page to update (default: the lead list). */
  path?: string;
  /** Sheet heading, e.g. "Visit date" or "Follow-up date". */
  title?: string;
}

/**
 * Custom visit-date range: tap a start day, tap an end day, then "Apply".
 * Tapping the same day twice (or applying after one tap) picks a single day.
 */
export function DateRangeSheet({ base, from, to, today, active, path = "/leads", title = "Visit date" }: DateRangeSheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DayRange>({ from, to });
  const [view, setView] = useState(isoMonth(to ?? from ?? today));
  const [focusDay, setFocusDay] = useState(to ?? from ?? today);
  const [pending, startTransition] = useTransition();
  const gridRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const keyNav = useRef(false);
  const touchX = useRef<number | null>(null);

  const thisMonth = isoMonth(today);
  const year = today.slice(0, 4);
  const chipLabel = active ? describeDateRange(from, to, today) : undefined;
  const cells = monthGrid(view);
  const canGoNext = view < thisMonth;

  // Roving tabindex: one tabbable day in the visible month, arrows move between days.
  const tabbable = isoMonth(focusDay) === view ? focusDay : (cells.find((d): d is string => d !== null && d <= today) ?? focusDay);

  useEffect(() => {
    if (!keyNav.current) return;
    keyNav.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focusDay}"]`)?.focus();
  }, [focusDay, view]);

  function onOpenChange(next: boolean) {
    if (next) {
      const anchor = to ?? from ?? today;
      setRange({ from, to });
      setView(isoMonth(anchor));
      setFocusDay(anchor);
    }
    setOpen(next);
  }

  function navigate(params: { from?: string; to?: string }) {
    setOpen(false);
    startTransition(() => {
      router.replace(buildHref(path, { ...base, ...params }), { scroll: false });
    });
  }

  function apply() {
    if (!range.from) return;
    navigate({ from: range.from, to: range.to ?? range.from });
  }

  function moveFocus(day: string) {
    const clamped = day > today ? today : day;
    keyNav.current = true;
    setFocusDay(clamped);
    if (isoMonth(clamped) !== view) setView(isoMonth(clamped));
  }

  function onDayKey(e: KeyboardEvent<HTMLButtonElement>, day: string) {
    const step = KEY_STEP[e.key];
    if (step !== undefined) {
      e.preventDefault();
      moveFocus(shiftIsoDate(day, step));
    } else if (e.key === "PageUp" || e.key === "PageDown") {
      e.preventDefault();
      const target = `${shiftMonth(isoMonth(day), e.key === "PageUp" ? -1 : 1)}-${day.slice(8)}`;
      // Clamp e.g. 31 Mar -> 28/29 Feb.
      const lastOfMonth = monthGrid(isoMonth(target)).filter((d): d is string => d !== null).at(-1) ?? target;
      moveFocus(target > lastOfMonth ? lastOfMonth : target);
    }
  }

  function onTouchStart(e: TouchEvent<HTMLDivElement>) {
    touchX.current = e.touches[0]?.clientX ?? null;
  }

  function onTouchEnd(e: TouchEvent<HTMLDivElement>) {
    const startX = touchX.current;
    const endX = e.changedTouches[0]?.clientX;
    touchX.current = null;
    if (startX === null || endX === undefined) return;
    const dx = endX - startX;
    if (dx > SWIPE_PX) setView((v) => shiftMonth(v, -1));
    else if (dx < -SWIPE_PX && canGoNext) setView((v) => shiftMonth(v, 1));
  }

  const pickingEnd = Boolean(range.from && !range.to);
  const hasSpan = Boolean(range.from && range.to && range.from !== range.to);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      onOpenAutoFocus={(e) => {
        // Land on the summary instead of the close button: no stray focus ring, and screen readers hear the range.
        e.preventDefault();
        summaryRef.current?.focus();
      }}
      trigger={
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label={chipLabel ? `${title}: ${chipLabel}. Change dates` : `Pick custom ${title.toLowerCase()}s`}
          className={cn(chipClass(active), "gap-2 pl-3")}
        >
          {pending ? (
            <Spinner aria-hidden="true" width={18} height={18} className="shrink-0" />
          ) : (
            <CalendarIcon aria-hidden="true" width={18} height={18} className="shrink-0" />
          )}
          {chipLabel ? <span className="chip-accent">{chipLabel}</span> : "Pick dates"}
        </button>
      }
    >
      <div className="space-y-4">
        {/* From / To summary. The highlighted box is the one the next tap fills. */}
        <div ref={summaryRef} tabIndex={-1} aria-live="polite" className="grid grid-cols-2 gap-2 outline-none">
          {(
            [
              ["From", range.from, !pickingEnd],
              ["To", range.to, pickingEnd],
            ] as const
          ).map(([label, value, next]) => (
            <div
              key={label}
              className={cn(
                "rounded-2xl px-3 py-2 transition-colors duration-150",
                next ? "bg-ink text-white" : "bg-surface-2",
              )}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">{label}</p>
              <p className="truncate text-lg font-semibold tabular-nums">
                {value ? formatShortDate(value, year) : <span className="font-normal opacity-70">{next ? "Tap a day" : "-"}</span>}
              </p>
            </div>
          ))}
        </div>
        <p className="-mt-1 text-sm text-muted">
          {pickingEnd
            ? "Now tap the last day, or apply for this one day."
            : hasSpan && range.from && range.to
              ? `${dayCount(range.from, range.to)} days selected`
              : "Tap the first day of the range."}
        </p>

        {/* Month header */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setView((v) => shiftMonth(v, -1))}
            aria-label="Previous month"
            className="press inline-flex size-12 items-center justify-center rounded-full"
          >
            <BackIcon width={20} height={20} />
          </button>
          <p aria-live="polite" className="text-base font-semibold">
            {monthFmt.format(toDate(`${view}-01`))}
          </p>
          <button
            type="button"
            onClick={() => setView((v) => shiftMonth(v, 1))}
            disabled={!canGoNext}
            aria-label="Next month"
            className="press inline-flex size-12 items-center justify-center rounded-full disabled:opacity-30"
          >
            <BackIcon width={20} height={20} className="rotate-180" />
          </button>
        </div>

        {/* Calendar: swipe left/right to change month */}
        <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="select-none">
          <div aria-hidden="true" className="mb-1 grid grid-cols-7 text-center text-xs font-semibold text-muted">
            {WEEKDAYS.map(([short, full]) => (
              <span key={full} className="py-1">
                {short}
              </span>
            ))}
          </div>
          <div
            ref={gridRef}
            key={view}
            role="group"
            aria-label={monthFmt.format(toDate(`${view}-01`))}
            className="grid grid-cols-7"
            style={{ animation: "fade-in 180ms var(--ease-standard)" }}
          >
            {cells.map((day, i) => {
              if (!day) return <span key={`pad-${i}`} aria-hidden="true" />;
              const disabled = day > today;
              const isStart = day === range.from;
              const isEnd = day === range.to;
              const selected = isStart || isEnd;
              const inside = hasSpan && range.from !== undefined && range.to !== undefined && day > range.from && day < range.to;
              // Continuous band behind the range; ends get a half band so the circle sits on it.
              const band = !hasSpan
                ? undefined
                : inside
                  ? "var(--primary-soft)"
                  : isStart
                    ? "linear-gradient(to right, transparent 50%, var(--primary-soft) 50%)"
                    : isEnd
                      ? "linear-gradient(to left, transparent 50%, var(--primary-soft) 50%)"
                      : undefined;
              const isToday = day === today;
              return (
                <div key={day} className="flex justify-center py-0.5" style={band ? { background: band } : undefined}>
                  <button
                    type="button"
                    data-day={day}
                    tabIndex={day === tabbable ? 0 : -1}
                    disabled={disabled}
                    aria-pressed={selected || inside}
                    aria-current={isToday ? "date" : undefined}
                    aria-label={`${dayFmt.format(toDate(day))}${isToday ? ", today" : ""}`}
                    onClick={() => {
                      setFocusDay(day);
                      setRange((r) => pickRangeDay(r, day));
                    }}
                    onKeyDown={(e) => onDayKey(e, day)}
                    className={cn(
                      "press relative flex aspect-square w-full max-w-12 items-center justify-center rounded-full text-[15px] tabular-nums",
                      "transition-colors duration-150",
                      selected
                        ? "bg-ink font-semibold text-white"
                        : inside
                          ? "font-medium text-on-primary-soft"
                          : "text-fg",
                      disabled && "pointer-events-none opacity-30",
                    )}
                  >
                    {Number(day.slice(8))}
                    {isToday && !selected ? (
                      <span aria-hidden="true" className="absolute bottom-1.5 size-1 rounded-full bg-primary" />
                    ) : null}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="sticky bottom-0 -mx-5 flex gap-2 border-t border-line bg-surface px-5 pb-2 pt-3">
          <Button onClick={apply} disabled={!range.from} className="w-full">
            Apply
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
