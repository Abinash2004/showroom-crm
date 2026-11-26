import type { Metadata } from "next";
import { AppBar } from "@/components/layout/app-bar";
import { PageBody } from "@/components/layout/page";
import { ToggleActive } from "@/components/admin/toggle-active";
import { EditableUserCard, NewUserSheet } from "@/components/admin/user-sheets";
import { EmptyState } from "@/components/ui/card";
import { PhoneIcon, StoreIcon } from "@/components/icons";
import { requireAdminPage } from "@/lib/auth/session";
import { listBranches } from "@/lib/db/repositories/branches";
import { listActiveSessions, listUsers } from "@/lib/db/repositories/users";
import { cn } from "@/lib/cn";
import { formatDateTime, formatPhone } from "@/lib/format";

export const metadata: Metadata = { title: "Users" };
export const runtime = "nodejs";

type Tone = "success" | "info" | "danger" | "warn";

/** Same capsule style as the lead status tags: the tone's colour as text on a 12% tint of it. */
const TONES: Record<Tone, string> = {
  success: "bg-status-purchased/12 text-status-purchased",
  info: "bg-status-booked/12 text-status-booked",
  danger: "bg-status-rejected/12 text-status-rejected",
  warn: "bg-status-opened/12 text-status-opened",
};

export default async function UsersPage() {
  const actor = await requireAdminPage();
  const [users, branches, sessions] = await Promise.all([listUsers(actor), listBranches(actor), listActiveSessions(actor)]);
  // O(1) lookups per branch id and signed-in user while rendering the cards.
  const branchNames = new Map(branches.map((b) => [b.id, b.name]));
  const online = new Set(sessions.map((s) => s.userId));
  const active = users.filter((u) => u.isActive).length;

  return (
    <>
      <AppBar title="Users" backHref="/admin" parent="Admin" />
      <PageBody wide>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm tabular-nums text-muted" aria-live="polite">
            {users.length === 0 ? "No users" : `${active} active of ${users.length} ${users.length === 1 ? "user" : "users"}`}
          </p>
          <NewUserSheet branches={branches} />
        </div>

        {users.length === 0 ? (
          <EmptyState title="No users">Create a user and share the employee code with them.</EmptyState>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {users.map((u) => {
              const tags: { label: string; tone: Tone }[] = [];
              if (online.has(u.id)) tags.push({ label: "Signed in", tone: "success" });
              if (u.isAdmin) tags.push({ label: "Admin", tone: "info" });
              if (!u.isActive) tags.push({ label: "Inactive", tone: "danger" });
              if (u.isLocked) tags.push({ label: "Locked", tone: "danger" });
              if (!u.hasPassword) tags.push({ label: "Sign-up pending", tone: "warn" });
              const branchLine = u.isAdmin
                ? "All branches"
                : u.branchIds.map((id) => branchNames.get(id) ?? "Unknown").join(", ") || "No branch";

              return (
                <li key={u.id} className="min-w-0">
                  {/*
                    Name + code and tags, phone, branch access, then last login (left) and Deactivate/Activate
                    (right). Tapping anywhere else edits the user.
                  */}
                  <EditableUserCard user={u} branches={branches}>
                    {/* 1. Name + code on one line, tags on the right */}
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="flex min-w-0 items-baseline gap-2">
                        <span className="line-clamp-1 min-w-0 text-[17px] font-semibold leading-snug [overflow-wrap:anywhere]">{u.name}</span>
                        <span className="shrink-0 text-xs font-semibold text-muted">{u.code}</span>
                      </h2>
                      {tags.length > 0 ? (
                        <div className="flex max-w-[55%] flex-wrap justify-end gap-1.5">
                          {tags.map((t) => (
                            <span key={t.label} className={cn("rounded-full px-2.5 py-1 text-xs font-semibold leading-4", TONES[t.tone])}>
                              {t.label}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    {/* 2. Phone */}
                    <p className="mt-1.5 flex items-center gap-1.5 text-[15px] font-semibold tabular-nums tracking-wide">
                      <PhoneIcon aria-hidden="true" width={15} height={15} className="shrink-0 text-muted" />
                      {formatPhone(u.phone)}
                    </p>

                    {/* 3. Branch access */}
                    <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-fg/80">
                      <StoreIcon aria-hidden="true" width={14} height={14} className="shrink-0 text-muted" />
                      <span className="truncate">{branchLine}</span>
                    </p>

                    {/* 4. Last login bottom-left; Deactivate/Activate (or "You" on your own card) bottom-right */}
                    <div className="mt-auto flex min-h-9 items-end justify-between gap-3 pt-4">
                      <p className="min-w-0 truncate text-xs tabular-nums text-muted">
                        Last login <span className="font-semibold text-fg">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "never"}</span>
                      </p>
                      {u.id !== actor.id ? (
                        <div className="pointer-events-auto shrink-0">
                          <ToggleActive kind="user" id={u.id} name={u.name} isActive={u.isActive} />
                        </div>
                      ) : (
                        <span className="inline-flex h-9 shrink-0 items-center rounded-full bg-ink px-3.5 text-xs font-semibold text-white">You</span>
                      )}
                    </div>
                  </EditableUserCard>
                </li>
              );
            })}
          </ul>
        )}
      </PageBody>
    </>
  );
}
