"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { BackIcon, RefreshIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import { useViewer } from "./viewer";

interface AppBarProps {
  title: string;
  /** Sub-screens: shows a back button before the title. Root screens show the title on its own. */
  backHref?: string;
  /** Optional breadcrumb label for the parent screen, e.g. "Leads" on Lead Information. */
  parent?: string;
  actions?: React.ReactNode;
}

const circle = "press inline-flex size-11 shrink-0 items-center justify-center rounded-full";

/** Screen header, pinned to the top: greeting or back + title on the left, refresh + avatar on the right. */
export function AppBar({ title, backHref, parent, actions }: AppBarProps) {
  const router = useRouter();
  const viewer = useViewer();
  const [pending, startTransition] = useTransition();

  return (
    <header className="sticky top-0 z-30 bg-bg pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-3 px-4">
        {backHref ? (
          <>
            <Link href={backHref} aria-label={parent ? `Back to ${parent}` : "Back"} className={cn(circle, "bg-surface-2 hover:bg-surface-2-hover")}>
              <BackIcon width={20} height={20} />
            </Link>
            <div className="flex min-w-0 flex-1 items-baseline gap-2">
              {parent ? (
                <span aria-hidden="true" className="hidden shrink-0 text-sm text-muted sm:inline">
                  {parent} /
                </span>
              ) : null}
              <h1 className="truncate font-display text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
            </div>
          </>
        ) : (
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          </div>
        )}
        {actions}
        <button
          type="button"
          onClick={() => startTransition(() => router.refresh())}
          aria-label="Refresh"
          className={cn(circle, "bg-surface-2 hover:bg-surface-2-hover")}
        >
          <RefreshIcon width={18} height={18} className={cn(pending && "animate-spin")} />
        </button>
        <Link
          href="/account"
          aria-label={`Account: ${viewer.name}`}
          className={cn(circle, "bg-ink font-display text-sm font-semibold text-white hover:bg-ink/90")}
        >
          {initials(viewer.name)}
        </Link>
      </div>
    </header>
  );
}
