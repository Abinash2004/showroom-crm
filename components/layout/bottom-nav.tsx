"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChatIcon, ListIcon, PlusIcon, ShieldIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import { roleLine, useViewer } from "./viewer";

interface Item {
  href: string;
  label: string;
  icon: (size: number) => React.ReactNode;
  match: (path: string) => boolean;
}

const LEADS: Item = {
  href: "/leads",
  label: "Leads",
  icon: (s) => <ListIcon width={s} height={s} />,
  match: (p) => p === "/leads" || (/^\/leads\/[^/]+/.test(p) && p !== "/leads/new"),
};
const FOLLOW_UPS: Item = {
  href: "/interactions",
  label: "Follow-ups",
  icon: (s) => <ChatIcon width={s} height={s} />,
  match: (p) => p.startsWith("/interactions"),
};
const NEW_LEAD: Item = {
  href: "/leads/new",
  label: "New lead",
  icon: (s) => <PlusIcon width={s} height={s} />,
  match: (p) => p === "/leads/new",
};
const ADMIN: Item = { href: "/admin", label: "Admin", icon: (s) => <ShieldIcon width={s} height={s} />, match: (p) => p.startsWith("/admin") };

function Brand() {
  return (
    <Link href="/leads" className="flex items-center gap-2.5 rounded-2xl px-1 py-1">
      <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-primary font-display text-base font-bold text-white">
        S
      </span>
      <span className="font-display text-lg tracking-tight">
        Showroom <span className="font-bold">CRM</span>
      </span>
    </Link>
  );
}

/**
 * Navigation shell.
 * Phones/tablets (< lg): floating obsidian dock with the emerald "New lead" pill and the main tabs.
 * Desktop (>= lg): floating obsidian sidebar rail with brand, CTA, nav stack and profile card.
 */
export function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const viewer = useViewer();
  const items = isAdmin ? [LEADS, FOLLOW_UPS, ADMIN] : [LEADS, FOLLOW_UPS];
  const newActive = pathname === "/leads/new";

  return (
    <>
      {/* Desktop rail */}
      <aside
        aria-label="Sidebar"
        className="fixed bottom-4 left-4 top-4 z-30 hidden w-[252px] flex-col justify-between rounded-[28px] bg-ink p-4 text-white shadow-[var(--shadow-rail)] lg:flex"
      >
        <div className="space-y-5">
          <Brand />
          <Link
            href="/leads/new"
            aria-current={newActive ? "page" : undefined}
            className="press flex h-12 items-center justify-center gap-2 rounded-full bg-primary font-semibold text-white hover:bg-primary-hover"
          >
            <PlusIcon width={18} height={18} /> New lead
          </Link>
          <nav aria-label="Primary">
            <ul className="space-y-1">
              {items.map((item) => {
                const active = item.match(pathname);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "press flex min-h-12 items-center gap-3 rounded-2xl px-4 text-[15px] font-medium transition-colors",
                        active ? "bg-white/15 text-white" : "text-zinc-400 hover:text-white",
                      )}
                    >
                      {item.icon(18)}
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        <div className="border-t border-white/10 pt-3">
          <Link href="/account" className="press flex items-center gap-3 rounded-2xl bg-white/10 p-3 hover:bg-white/15">
            <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary font-display text-sm font-semibold text-white">
              {initials(viewer.name)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{viewer.name}</span>
              <span className="block truncate text-xs text-zinc-400">{roleLine(viewer)}</span>
            </span>
          </Link>
        </div>
      </aside>

      {/* Mobile dock */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-3.5 bottom-[calc(0.875rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md rounded-full bg-ink p-1.5 shadow-[var(--shadow-dock)] lg:hidden"
      >
        {/*
          The selected tab grows into an emerald pill (icon left, label right); the rest shrink to
          icon-over-label with no background. Width animates through flex-grow.
        */}
        <ul className="flex items-center gap-1">
          {[NEW_LEAD, ...items].map((item) => {
            const active = item.match(pathname);
            return (
              <li
                key={item.href}
                className={cn("min-w-0 transition-[flex-grow] duration-300 ease-[var(--ease-standard)]", active ? "grow-[1.6]" : "grow")}
                style={{ flexBasis: 0 }}
              >
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "press flex h-11 w-full items-center justify-center rounded-full transition-colors duration-300",
                    active
                      ? "flex-row gap-1.5 bg-primary px-3 text-white hover:bg-primary-hover"
                      : "flex-col gap-0.5 px-1 text-zinc-400 hover:text-zinc-200",
                  )}
                >
                  <span className="shrink-0">{item.icon(active ? 18 : 20)}</span>
                  <span
                    className={cn(
                      "truncate whitespace-nowrap leading-none",
                      active ? "text-[13px] font-semibold" : "text-[11px] font-medium",
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
