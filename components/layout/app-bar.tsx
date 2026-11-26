"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { BackIcon, RefreshIcon, UserIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

interface AppBarProps {
  title: string;
  backHref?: string;
  actions?: React.ReactNode;
}

/** Top app bar, always pinned to the top of the screen. */
export function AppBar({ title, backHref, actions }: AppBarProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-1 px-2">
        {backHref ? (
          <Link href={backHref} aria-label="Back" className="press inline-flex size-12 items-center justify-center rounded-full">
            <BackIcon />
          </Link>
        ) : null}
        <h1 className={cn("min-w-0 flex-1 truncate text-lg font-semibold", !backHref && "pl-3")}>{title}</h1>
        {actions}
        <button
          type="button"
          onClick={() => startTransition(() => router.refresh())}
          aria-label="Refresh"
          className="press inline-flex size-12 items-center justify-center rounded-full"
        >
          <RefreshIcon className={cn(pending && "animate-spin")} />
        </button>
        <Link href="/account" aria-label="Account" className="press inline-flex size-12 items-center justify-center rounded-full">
          <UserIcon />
        </Link>
      </div>
    </header>
  );
}