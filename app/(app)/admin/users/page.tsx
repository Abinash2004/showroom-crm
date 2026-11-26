import type { Metadata } from "next";
import { AppBar } from "@/components/layout/app-bar";
import { PageBody } from "@/components/layout/page";
import { ToggleActive } from "@/components/admin/toggle-active";
import { EditUserSheet, NewUserSheet } from "@/components/admin/user-sheets";
import { Card, EmptyState } from "@/components/ui/card";
import { Pill } from "@/components/ui/status-badge";
import { PhoneIcon, StoreIcon } from "@/components/icons";
import { requireAdminPage } from "@/lib/auth/session";
import { listBranches } from "@/lib/db/repositories/branches";
import { listActiveSessions, listUsers } from "@/lib/db/repositories/users";
import { formatDateTime, formatPhone } from "@/lib/format";

export const metadata: Metadata = { title: "Users" };
export const runtime = "nodejs";

export default async function UsersPage() {
  const actor = await requireAdminPage();
  const [users, branches, sessions] = await Promise.all([listUsers(actor), listBranches(actor), listActiveSessions(actor)]);
  const branchNames = new Map(branches.map((b) => [b.id, b.name]));
  const online = new Set(sessions.map((s) => s.userId));
  const active = users.filter((u) => u.isActive).length;

  return (
    <>
      <AppBar title="Users" backHref="/admin" />
      <PageBody>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted" aria-live="polite">
            {users.length === 0 ? "No users" : `${active} active of ${users.length}`}
          </p>
          <NewUserSheet branches={branches} />
        </div>

        {users.length === 0 ? (
          <EmptyState title="No users">Create a user and share the employee code with them.</EmptyState>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {users.map((u) => (
              <li key={u.id} className="min-w-0">
                <Card className="flex h-full flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold">{u.name}</h2>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{u.code}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-1">
                      {online.has(u.id) ? <Pill tone="success">Signed in</Pill> : null}
                      {u.isAdmin ? <Pill tone="info">Admin</Pill> : null}
                      {!u.isActive ? <Pill tone="danger">Inactive</Pill> : null}
                      {u.isLocked ? <Pill tone="danger">Locked</Pill> : null}
                      {!u.hasPassword ? <Pill>Sign-up pending</Pill> : null}
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-muted">
                    <p className="flex items-center gap-2 tabular-nums">
                      <PhoneIcon aria-hidden="true" width={16} height={16} className="shrink-0" />
                      {formatPhone(u.phone)}
                    </p>
                    <p className="flex min-w-0 items-start gap-2">
                      <StoreIcon aria-hidden="true" width={16} height={16} className="mt-0.5 shrink-0" />
                      <span className="min-w-0">
                        {u.isAdmin ? "All branches" : u.branchIds.map((id) => branchNames.get(id) ?? "Unknown").join(", ") || "No branch"}
                      </span>
                    </p>
                    <p>Last login: {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}</p>
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2 pt-1">
                    <EditUserSheet user={u} branches={branches} />
                    {u.id !== actor.id ? <ToggleActive kind="user" id={u.id} name={u.name} isActive={u.isActive} /> : null}
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
