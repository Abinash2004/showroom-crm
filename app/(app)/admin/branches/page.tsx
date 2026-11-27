import type { Metadata } from "next";
import { AppBar } from "@/components/layout/app-bar";
import { PageBody } from "@/components/layout/page";
import { EditableBranchCard, NewBranchSheet } from "@/components/admin/branch-sheets";
import { ToggleActive } from "@/components/admin/toggle-active";
import { EmptyState } from "@/components/ui/card";
import { PhoneIcon, PinIcon } from "@/components/icons";
import { requireAdminPage } from "@/lib/auth/session";
import { listBranches } from "@/lib/db/repositories/branches";
import { cn } from "@/lib/cn";
import { formatPhone } from "@/lib/format";

export const metadata: Metadata = { title: "Branches" };
export const runtime = "nodejs";

export default async function BranchesPage() {
  const actor = await requireAdminPage();
  const branches = await listBranches(actor);
  const active = branches.filter((b) => b.isActive).length;

  return (
    <>
      <AppBar title="Branches" backHref="/admin" parent="Admin" />
      <PageBody wide>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm tabular-nums text-muted" aria-live="polite">
            {branches.length === 0 ? "No branches" : `${active} active of ${branches.length} ${branches.length === 1 ? "branch" : "branches"}`}
          </p>
          <NewBranchSheet />
        </div>

        {branches.length === 0 ? (
          <EmptyState title="No branches yet">Create the first branch to start adding leads.</EmptyState>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {branches.map((b) => (
              <li key={b.id} className="min-w-0">
                {/*
                  Name + location and status, phone underneath, then code (left) and Deactivate/Activate (right).
                  Tapping anywhere else on the card edits it.
                */}
                <EditableBranchCard branch={b}>
                  {/* 1. Name + location on one line, status tag on the right */}
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="flex min-w-0 items-baseline gap-2">
                      <span className="line-clamp-1 shrink-0 text-[1.0625rem] font-semibold leading-snug [overflow-wrap:anywhere]">{b.name}</span>
                      <span className="flex min-w-0 items-center gap-1 text-sm font-normal text-muted">
                        <PinIcon aria-hidden="true" width={14} height={14} className="shrink-0 self-center" />
                        <span className="truncate">{b.location}</span>
                      </span>
                    </h2>
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold leading-4",
                        b.isActive ? "bg-status-purchased/12 text-status-purchased" : "bg-status-rejected/12 text-status-rejected",
                      )}
                    >
                      {b.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* 2. Phone, right under the name */}
                  <p className="mt-1.5 flex items-center gap-1.5 text-[0.9375rem] font-semibold tabular-nums tracking-wide">
                    <PhoneIcon aria-hidden="true" width={15} height={15} className="shrink-0 text-muted" />
                    {formatPhone(b.phone)}
                  </p>

                  {/* 3. Code bottom-left, Deactivate/Activate bottom-right */}
                  <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                    <p className="min-w-0 truncate text-xs text-muted">
                      Code <span className="font-semibold text-fg">{b.code}</span>
                    </p>
                    <div className="pointer-events-auto shrink-0">
                      <ToggleActive kind="branch" id={b.id} name={b.name} isActive={b.isActive} />
                    </div>
                  </div>
                </EditableBranchCard>
              </li>
            ))}
          </ul>
        )}
      </PageBody>
    </>
  );
}
