import type { Metadata } from "next";
import { AppBar } from "@/components/layout/app-bar";
import { PageBody } from "@/components/layout/page";
import { EmptyState } from "@/components/ui/card";
import { PhoneIcon } from "@/components/icons";
import { requireAdminPage } from "@/lib/auth/session";
import { listActiveSessions } from "@/lib/db/repositories/users";
import { cn } from "@/lib/cn";
import { formatAgo, formatDateTime, formatPhone, initials } from "@/lib/format";
import type { ActiveSessionDTO } from "@/lib/types";
import { describeDevice, describeIp } from "@/lib/user-agent";

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
    // Card-sized dark tile: big number in the accent green, label to its right, sitting on the number's baseline.
    <div className="flex items-end gap-3 rounded-[22px] bg-ink p-4 text-white">
      <span className="shrink-0 text-4xl font-semibold tabular-nums leading-none tracking-tight text-[var(--accent-on-ink)]">{value}</span>
      <span className="min-w-0 pb-0.5 text-sm leading-tight text-zinc-300">{label}</span>
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
      <AppBar title="Active sessions" backHref="/admin" parent="Admin" />
      <PageBody wide className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Stat value={groups.length} label={groups.length === 1 ? "user signed in" : "users signed in"} />
          <Stat value={activeNow} label="active now" />
        </div>

        {groups.length === 0 ? (
          <EmptyState title="Nobody is signed in">Sessions appear here as soon as someone signs in.</EmptyState>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {groups.map((g) => {
              const live = now - g.lastActiveMs < ACTIVE_WINDOW_MS;
              return (
                <li key={g.userId} className="min-w-0 rounded-[22px] bg-surface-2 p-4">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white"
                    >
                      {initials(g.name)}
                      <span
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-[var(--surface-2)]",
                          live ? "bg-status-purchased" : "bg-muted",
                        )}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="line-clamp-1 text-[17px] font-semibold leading-snug [overflow-wrap:anywhere]">{g.name}</h2>
                      <p className={cn("text-sm", live ? "font-semibold text-status-purchased" : "text-muted")}>
                        {live ? "Active now" : `Last active ${formatAgo(new Date(g.lastActiveMs).toISOString(), now)}`}
                      </p>
                    </div>
                    <a
                      href={`tel:${g.phone}`}
                      aria-label={`Call ${g.name} on ${formatPhone(g.phone)}`}
                      className="press inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-white hover:bg-ink/90"
                    >
                      <PhoneIcon width={18} height={18} />
                    </a>
                  </div>

                  <ul className="mt-3 divide-y divide-line rounded-2xl bg-surface" aria-label={`${g.name}'s devices`}>
                    {g.sessions.map((s) => {
                      const device = describeDevice(s.userAgent);
                      return (
                        <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-medium">{device.label}</p>
                            <p className="mt-0.5 truncate text-xs tabular-nums text-muted">
                              {describeIp(s.userIp)} &middot; Signed in {formatDateTime(s.createdAt)}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize leading-4",
                              device.kind === "desktop" ? "bg-surface-2 text-muted" : "bg-status-booked/12 text-status-booked",
                            )}
                          >
                            {device.kind}
                          </span>
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
