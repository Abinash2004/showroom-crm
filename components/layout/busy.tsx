"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";

/*
 * App-wide "your tap was received" signal, shown as a spinning wheel in the app bar.
 * Sources: pending Server Action forms, pending router transitions (filters, search, refresh) and
 * in-app link navigations. Purely informational: nothing is blurred or disabled.
 */

/** Keeps the wheel up long enough to be seen, so fast responses don't flash it. */
const MIN_VISIBLE_MS = 600;
/** Safety net for navigations that never land (aborted, failed), so the wheel can't spin forever. */
const NAV_TIMEOUT_MS = 15_000;

let sources = 0;
let navigating = false;
let navTimer: ReturnType<typeof setTimeout> | undefined;
let visible = false;
let shownAt = 0;
let hideTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function update() {
  if (sources > 0 || navigating) {
    clearTimeout(hideTimer);
    hideTimer = undefined;
    if (!visible) {
      visible = true;
      shownAt = Date.now();
      emit();
    }
    return;
  }
  if (!visible || hideTimer) return;
  hideTimer = setTimeout(() => {
    hideTimer = undefined;
    visible = false;
    emit();
  }, Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt)));
}

function setNavigating(next: boolean) {
  clearTimeout(navTimer);
  navTimer = next ? setTimeout(() => setNavigating(false), NAV_TIMEOUT_MS) : undefined;
  if (navigating === next) return;
  navigating = next;
  update();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Report a pending state (form action, transition) to the app bar wheel while `active` is true. */
export function useBusySignal(active: boolean) {
  useEffect(() => {
    if (!active) return;
    sources += 1;
    update();
    return () => {
      sources -= 1;
      update();
    };
  }, [active]);
}

export function useBusyVisible(): boolean {
  return useSyncExternalStore(subscribe, () => visible, () => false);
}

/** True for a plain left click on an in-app link that leads to a different page or filter. */
function isInAppNavigation(event: MouseEvent): boolean {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
  if (!(anchor instanceof HTMLAnchorElement)) return false;
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return false; // also skips tel:, mailto:
  return url.pathname + url.search !== window.location.pathname + window.location.search;
}

function RouteWatcher() {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  // The new route has rendered: the navigation is done.
  useEffect(() => {
    setNavigating(false);
  }, [pathname, search]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (isInAppNavigation(event)) setNavigating(true);
    };
    // Capture phase: runs before any handler can stop propagation.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}

/** Mount once in the signed-in layout: turns link taps into wheel time until the new page lands. */
export function NavigationBusyWatcher() {
  return (
    <Suspense fallback={null}>
      <RouteWatcher />
    </Suspense>
  );
}

/**
 * Showroom-style activity mark: a spinning alloy wheel (tyre treads, five spokes, emerald rim)
 * in an Obsidian circle matching the app bar buttons.
 */
export function WheelLoader({ className }: { className?: string }) {
  return <WheelMark spinning className={`busy-capsule size-11 ${className ?? ""}`} />;
}

/**
 * The app logo: the same wheel, static by default. `spinning` turns on the rolling animation.
 * Size comes from `className` (e.g. `size-9`); the wheel fills ~73% of the circle, as in the favicon.
 */
export function WheelMark({ spinning = false, className, wheelClassName = "size-[73%]" }: { spinning?: boolean; className?: string; wheelClassName?: string }) {
  return (
    <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center rounded-full bg-ink ${className ?? ""}`}>
      <svg viewBox="0 0 32 32" className={`${wheelClassName} ${spinning ? "busy-wheel" : ""}`}>
        <g className={spinning ? "busy-wheel-spin" : undefined}>
          {/* Tyre with tread notches */}
          <circle cx="16" cy="16" r="12.5" fill="none" stroke="#f5f5f0" strokeWidth="3.5" />
          <circle cx="16" cy="16" r="12.5" fill="none" stroke="#1b1c1e" strokeWidth="3.5" strokeDasharray="1.4 3.5" opacity="0.55" />
          {/* Rim */}
          <circle cx="16" cy="16" r="8.6" fill="none" stroke="var(--accent-on-ink)" strokeWidth="1.4" />
          {/* Five spokes */}
          {[0, 72, 144, 216, 288].map((deg) => (
            <line
              key={deg}
              x1="16"
              y1="16"
              x2="16"
              y2="8"
              stroke="var(--accent-on-ink)"
              strokeWidth="1.8"
              strokeLinecap="round"
              transform={`rotate(${deg} 16 16)`}
            />
          ))}
          {/* Hub */}
          <circle cx="16" cy="16" r="2.6" fill="var(--accent-on-ink)" />
          <circle cx="16" cy="16" r="1" fill="#1b1c1e" />
        </g>
      </svg>
    </span>
  );
}

/** App bar slot: the wheel while anything is pending, nothing otherwise. Announced politely to screen readers. */
export function BusyIndicator({ className }: { className?: string }) {
  const busy = useBusyVisible();
  return (
    <>
      <span role="status" aria-live="polite" className="sr-only">
        {busy ? "Working on it" : ""}
      </span>
      {busy ? <WheelLoader className={className} /> : null}
    </>
  );
}

/** Logo that rolls while anything is pending (sidebar brand, auth pages where there is no app bar). */
export function LiveWheelMark({ className, wheelClassName }: { className?: string; wheelClassName?: string }) {
  return <WheelMark spinning={useBusyVisible()} className={className} wheelClassName={wheelClassName} />;
}

/** Drop inside a plain `<form action={serverAction}>` (no useActionForm) to report its submit to the wheel. */
export function FormBusySignal() {
  const { pending } = useFormStatus();
  useBusySignal(pending);
  return null;
}
