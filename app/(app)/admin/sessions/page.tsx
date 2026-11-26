import type { Metadata } from "next";
import { AppBar } from "@/components/layout/app-bar";
import { PageBody } from "@/components/layout/page";
import { EmptyState } from "@/components/ui/card";
import { Pill } from "@/components/ui/status-badge";
import { PhoneIcon } from "@/components/icons";
import { requireAdminPage } from "@/lib/auth/session";
import { listActiveSessions } from "@/lib/db/repositories/users";
import { cn } from "@/lib/cn";
import { formatAgo, formatDateTime, formatPhone } from "@/lib/format";
import type { ActiveSessionDTO } from "@/lib/types";
import { describeDevice } from "@/lib/user-agent";

export const metadata: Metadata = { title: "Active sessions" };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Sessions report activity at most once a minute, so anything within 5 minutes counts as "active now". */
const ACTIVE_WINDOW_MS = 5 * 60_000;

/** Request time for relative labels; read once per render outside the component body. */
const requestNow = (): number => Date.now();

interface UserGroup {
  userId: string;
  name: string;
  phone: string;
  sessions: ActiveSessionDTO[];
  lastActiveMs: number;
}

/** Groups sessions by user in one pass (hash map, O(n)); most recently active user first. */
function groupByUser(sessions: ActiveSessionDTO[]): UserGroup[] {
  const groups = new Map<string, UserGroup>();
  for (const s of sessions) {
    const t = new Date(s.lastActiveAt).getTime();
    const g = groups.get(s.userId);
    if (g) {
      g.sessions.push(s);
      g.lastActiveMs = Math.max(g.lastActiveMs, t);
    } else {
      groups.set(s.userId, { userId: s.userId, name: s.userName, phone: s.userPhone, sessions: [s], lastActiveMs: t });
    }
  }
  return [...groups.values()].sort((a, b) => b.lastActiveMs - a.lastActiveMs);
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-card bg-surface p-4 shadow-card">
      <p className="text-3xl font-semibold tabular-nums leading-none">{value}</p>
      <p className="mt-1.5 text-sm text-muted">{label}</p>
    </div>
  );
}

export default async function SessionsPage() {
  const actor = await requireAdminPage();
  const sessions = await listActiveSessions(actor);
  const now = requestNow();
  const groups = groupByUser(sessions);
  const activeNow = groups.filter((g) => now - g.lastActiveMs < ACTIVE_WINDOW_MS).length;

  return (
    <>
      <AppBar title="Active sessions" backHref="/admin" />
      <PageBody className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat value={groups.length} label={groups.length === 1 ? "user signed in" : "users signed in"} />
          <Stat value={activeNow} label="active now" />
          <Stat value={sessions.length} label={sessions.length === 1 ? "device" : "devices"} />
        </div>
        <p className="px-1 text-sm text-muted">Everyone is signed out at midnight. Deactivating a user on the Users page signs them out immediately.</p>

        {groups.length === 0 ? (
          <EmptyState title="Nobody is signed in">Sessions appear here as soon as someone signs in.</EmptyState>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {groups.map((g) => {
              const live = now - g.lastActiveMs < ACTIVE_WINDOW_MS;
              return (
                <li key={g.userId} className="min-w-0 rounded-card bg-surface p-4 shadow-card">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-base font-bold text-on-primary-soft"
                    >
                      {g.name.trim().charAt(0).toUpperCase()}
                      <span
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-surface",
                          live ? "bg-[#22c55e]" : "bg-[var(--line)]",
                        )}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-base font-semibold">{g.name}</h2>
                      <p className="text-sm text-muted">
                        {live ? "Active now" : `Last active ${formatAgo(new Date(g.lastActiveMs).toISOString(), now)}`}
                      </p>
                    </div>
                    <a
                      href={`tel:${g.phone}`}
                      aria-label={`Call ${g.name} on ${formatPhone(g.phone)}`}
                      className="press inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-on-primary-soft"
                    >
                      <PhoneIcon width={20} height={20} />
                    </a>
                  </div>

                  <ul className="mt-3 divide-y divide-line rounded-xl bg-surface-2" aria-label={`${g.name}'s devices`}>
                    {g.sessions.map((s) => {
                      const device = describeDevice(s.userAgent);
                      return (
                        <li key={s.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{device.label}</p>
                            <p className="truncate text-xs text-muted">
                              {s.userIp} &middot; signed in {formatDateTime(s.createdAt)}
                            </p>
                          </div>
                          <Pill tone={device.kind === "desktop" ? "neutral" : "info"}>{device.kind}</Pill>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </PageBody>
    </>
  );
}
