"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { RefreshIcon } from "@/components/icons";

const THRESHOLD = 72;
const MAX_PULL = 96;

/** Touch pull-to-refresh. A visible Refresh button in the app bar provides the non-gesture alternative. */
export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [refreshing, startTransition] = useTransition();
  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      startY.current = window.scrollY <= 0 && touch ? touch.clientY : null;
    };
    const onMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (startY.current === null || !touch) return;
      const dy = touch.clientY - startY.current;
      if (dy <= 0 || window.scrollY > 0) {
        pullRef.current = 0;
        setPull(0);
        return;
      }
      pullRef.current = Math.min(dy * 0.5, MAX_PULL);
      setPull(pullRef.current);
    };
    const onEnd = () => {
      const shouldRefresh = pullRef.current >= THRESHOLD;
      startY.current = null;
      pullRef.current = 0;
      setPull(0);
      if (shouldRefresh) startTransition(() => router.refresh());
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [router]);

  const visible = pull > 0 || refreshing;
  return (
    <>
      <div
        aria-hidden={!visible}
        className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+3.5rem)] z-20 flex justify-center"
        style={{ transform: `translateY(${refreshing ? 12 : pull / 2}px)`, opacity: visible ? 1 : 0, transition: pull ? "none" : "all 200ms" }}
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-surface text-primary shadow-card">
          <RefreshIcon className={refreshing ? "animate-spin" : undefined} style={{ transform: `rotate(${pull * 3}deg)` }} />
        </span>
      </div>
      <span role="status" className="sr-only">
        {refreshing ? "Refreshing" : ""}
      </span>
      {children}
    </>
  );
}