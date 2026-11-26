import type { Metadata } from "next";
import { AppBar } from "@/components/layout/app-bar";
import { PageBody } from "@/components/layout/page";
import { EditBranchSheet, NewBranchSheet } from "@/components/admin/branch-sheets";
import { ToggleActive } from "@/components/admin/toggle-active";
import { Card, EmptyState } from "@/components/ui/card";
import { Pill } from "@/components/ui/status-badge";
import { PhoneIcon, PinIcon } from "@/components/icons";
import { requireAdminPage } from "@/lib/auth/session";
import { listBranches } from "@/lib/db/repositories/branches";
import { formatPhone } from "@/lib/format";

export const metadata: Metadata = { title: "Branches" };
export const runtime = "nodejs";

export default async function BranchesPage() {
  const actor = await requireAdminPage();
  const branches = await listBranches(actor);
  const active = branches.filter((b) => b.isActive).length;

  return (
    <>
      <AppBar title="Branches" backHref="/admin" />
      <PageBody>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted" aria-live="polite">
            {branches.length === 0 ? "No branches" : `${active} active of ${branches.length}`}
          </p>
          <NewBranchSheet />
        </div>

        {branches.length === 0 ? (
          <EmptyState title="No branches yet">Create the first branch to start adding leads.</EmptyState>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {branches.map((b) => (
              <li key={b.id} className="min-w-0">
                <Card className="flex h-full flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold">{b.name}</h2>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{b.code}</p>
                    </div>
                    <Pill tone={b.isActive ? "success" : "danger"}>{b.isActive ? "Active" : "Inactive"}</Pill>
                  </div>
                  <div className="space-y-1 text-sm text-muted">
                    <p className="flex min-w-0 items-center gap-2">
                      <PinIcon aria-hidden="true" width={16} height={16} className="shrink-0" />
                      <span className="truncate">{b.location}</span>
                    </p>
                    <p className="flex items-center gap-2 tabular-nums">
                      <PhoneIcon aria-hidden="true" width={16} height={16} className="shrink-0" />
                      {formatPhone(b.phone)}
                    </p>
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2 pt-1">
                    <EditBranchSheet branch={b} />
                    <ToggleActive kind="branch" id={b.id} name={b.name} isActive={b.isActive} />
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </PageBody>
    </>
  );
}
