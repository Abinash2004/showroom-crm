"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChatIcon, ListIcon, PlusIcon, ShieldIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

interface Item {
  href: string;
  label: string;
  icon: React.ReactNode;
  match: (path: string) => boolean;
}

const ITEMS: Item[] = [
  { href: "/leads", label: "Leads", icon: <ListIcon />, match: (p) => p === "/leads" || (/^\/leads\/[^/]+/.test(p) && p !== "/leads/new") },
  { href: "/leads/new", label: "New lead", icon: <PlusIcon />, match: (p) => p === "/leads/new" },
  { href: "/interactions", label: "Follow-ups", icon: <ChatIcon />, match: (p) => p.startsWith("/interactions") },
];
const ADMIN_ITEM: Item = { href: "/admin", label: "Admin", icon: <ShieldIcon />, match: (p) => p.startsWith("/admin") };

/** Bottom navigation on phones, side rail from 768px up. */
export function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = isAdmin ? [...ITEMS, ADMIN_ITEM] : ITEMS;
  return (
    <nav
      aria-label="Primary"
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]",
        "md:inset-y-0 md:right-auto md:w-24 md:border-r md:border-t-0 md:pb-0",
      )}
    >
      <ul className="mx-auto flex max-w-xl justify-around md:h-full md:max-w-none md:flex-col md:items-center md:justify-start md:gap-2 md:pt-6">
        {items.map((item) => {
          const active = item.match(pathname);
          return (
            <li key={item.href} className="flex-1 md:flex-none">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="press flex min-h-16 min-w-12 flex-col items-center justify-center gap-1 px-2 text-xs font-medium md:w-20"
              >
                <span
                  className={cn(
                    "flex h-8 w-16 items-center justify-center rounded-full transition-colors duration-200",
                    active ? "bg-primary-soft text-on-primary-soft" : "text-muted",
                  )}
                >
                  {item.icon}
                </span>
                <span className={active ? "text-fg" : "text-muted"}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}