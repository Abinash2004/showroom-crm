"use client";

import { LazyMotion, MotionConfig, m } from "motion/react";

const loadFeatures = () => import("motion/react").then((mod) => mod.domAnimation);

/** Spring slide-up on route change. The animation engine loads lazily and honours prefers-reduced-motion. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={loadFeatures} strict>
        <m.div initial={{ y: 14 }} animate={{ y: 0 }} transition={{ type: "spring", stiffness: 420, damping: 36 }}>
          {children}
        </m.div>
      </LazyMotion>
    </MotionConfig>
  );
}