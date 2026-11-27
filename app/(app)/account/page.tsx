import type { Metadata } from "next";
import { AppBar } from "@/components/layout/app-bar";
import { PageBody } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { LogOutIcon, StoreIcon } from "@/components/icons";
import { logoutAction } from "@/lib/actions/auth";
import { requireActor } from "@/lib/auth/session";
import { listBranches } from "@/lib/db/repositories/branches";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const actor = await requireActor();
  const branches = await listBranches(actor);
  const branchLine = actor.isAdmin ? "All branches" : branches.length ? branches.map((b) => b.name).join(", ") : "None assigned";

  return (
    <>
      <AppBar title="Account" backHref="/leads" />
      <PageBody className="space-y-3">
        {/* Same card language as the user cards: avatar + name with role tag, details, then session info. */}
        <section aria-label="Your account" className="rounded-[22px] bg-surface-2 p-4">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-base font-semibold text-white"
            >
              {initials(actor.name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <h2 className="line-clamp-1 min-w-0 text-[1.0625rem] font-semibold leading-snug [overflow-wrap:anywhere]">{actor.name}</h2>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold leading-4",
                    actor.isAdmin ? "bg-status-booked/12 text-status-booked" : "bg-surface text-muted",
                  )}
                >
                  {actor.isAdmin ? "Admin" : "Sales user"}
                </span>
              </div>
              <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-fg/80">
                <StoreIcon aria-hidden="true" width={14} height={14} className="shrink-0 text-muted" />
                <span className="truncate">{branchLine}</span>
              </p>
            </div>
          </div>

          <p className="mt-4 rounded-2xl bg-surface px-3.5 py-3 text-xs text-muted">
            Your session ends automatically at <span className="font-semibold text-fg">midnight (IST)</span>. Sign in again the next day.
          </p>
        </section>

        <form action={logoutAction}>
          {/* `!`: the ink variant sets text-white; sign out reads in the same red as Deactivate. */}
          <Button type="submit" variant="ink" className="w-full text-[var(--danger-on-ink)]!">
            <LogOutIcon width={18} height={18} aria-hidden="true" /> Sign out
          </Button>
        </form>
      </PageBody>
    </>
  );
}
