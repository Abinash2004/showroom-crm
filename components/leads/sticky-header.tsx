/**
 * Filter section + result count, pinned below the app bar while the cards scroll underneath.
 * `-mt-4 pt-4` takes over the page's full 16px top padding, so the gap under the app bar is the same 16px
 * before and after it sticks.
 */
export function StickyHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky-header z-20 -mx-4 -mt-4 bg-bg px-4 pb-1 pt-4">
      {children}
      {/* Soft fade so cards slide under the header instead of being cut by a hard edge. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-full h-3 bg-linear-to-b from-bg to-transparent" />
    </div>
  );
}
