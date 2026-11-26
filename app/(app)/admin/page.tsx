import type { Metadata } from "next";
import Link from "next/link";
import { AppBar } from "@/components/layout/app-bar";
import { PageBody } from "@/components/layout/page";
import { ActivityIcon, ShieldIcon, StoreIcon, UserIcon } from "@/components/icons";
import { requireAdminPage } from "@/lib/auth/session";
import { adminOverview } from "@/lib/db/repositories/admin";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Admin" };
export const runtime = "nodejs";

type Tone = "neutral" | "warn" | "danger" | "success";

/** Same capsule style as the lead status tags: the tone's colour as text on a 12% tint of it. */
const TONES: Record<Tone, string> = {
  neutral: "bg-surface text-muted",
  warn: "bg-status-opened/12 text-status-opened",
  danger: "bg-status-rejected/12 text-status-rejected",
  success: "bg-status-purchased/12 text-status-purchased",
};

interface Tag {
  label: string;
  tone: Tone;
}

interface HubCardProps {
  href: string;
  title: string;
  text: string;
  icon: React.ReactNode;
  /** Headline number, shown in the dark chip with its unit, e.g. 2 + "active". */
  value: number;
  unit: string;
  /** Secondary context in the footer, e.g. "of 4 total". */
  detail?: string;
  tags?: Tag[];
}

/**
 * Admin hub card, same layout as the lead and follow-up cards:
 *   1. title with any attention tags on the right,
 *   2. what the section is for,
 *   3. footer with context on the left and the key number in a dark chip on the right.
 * The whole card is one link.
 */
function HubCard({ href, title, text, icon, value, unit, detail, tags = [] }: HubCardProps) {
  return (
    <li className="min-w-0">
      <Link
        href={href}
        className="press flex h-full min-h-12 flex-col rounded-[22px] bg-surface-2 p-4 transition-colors hover:bg-surface-2-hover"
      >
        {/* 1. Title + tags */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="flex min-w-0 items-center gap-2 text-[17px] font-semibold leading-snug">
            <span aria-hidden="true" className="shrink-0 text-muted">
              {icon}
            </span>
            <span className="truncate">{title}</span>
          </h3>
          {tags.length > 0 ? (
            <div className="flex max-w-[60%] flex-wrap justify-end gap-1.5">
              {tags.map((t) => (
                <span key={t.label} className={cn("rounded-full px-2.5 py-1 text-xs font-semibold leading-4 tabular-nums", TONES[t.tone])}>
                  {t.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {/* 2. Purpose */}
        <p className="mt-1 text-sm leading-relaxed text-fg/80">{text}</p>

        {/* 3. Context + key number */}
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <p className="min-w-0 truncate text-xs text-muted tabular-nums">{detail}</p>
          <span className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-ink px-3.5 text-xs font-semibold leading-4 tabular-nums text-white">
            <span className="text-[var(--accent-on-ink)]">{value}</span>
            <span className="font-medium text-zinc-300">{unit}</span>
          </span>
        </div>
      </Link>
    </li>
  );
}

function Group({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="px-1 text-[15px] font-semibold text-muted">
        {title}
      </h2>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">{children}</ul>
    </section>
  );
}

export default async function AdminPage() {
  const actor = await requireAdminPage();
  const o = await adminOverview(actor);
  const inactiveUsers = o.users.total - o.users.active;

  const userTags: Tag[] = [];
  if (o.users.pendingSignup > 0) userTags.push({ label: `${o.users.pendingSignup} sign-up pending`, tone: "warn" });
  if (o.users.locked > 0) userTags.push({ label: `${o.users.locked} locked`, tone: "danger" });
  if (inactiveUsers > 0) userTags.push({ label: `${inactiveUsers} inactive`, tone: "neutral" });

  return (
    <>
      <AppBar title="Admin" />
      <PageBody wide className="space-y-6">
        <Group id="org-heading" title="Organization">
          <HubCard
            href="/admin/branches"
            title="Branches"
            text="Create showroom locations and switch them on or off."
            icon={<StoreIcon width={18} height={18} />}
            value={o.branches.active}
            unit="active"
            detail={`${o.branches.total} ${o.branches.total === 1 ? "branch" : "branches"} in total`}
          />
          <HubCard
            href="/admin/users"
            title="Users"
            text="Register employees, assign branches and deactivate access."
            icon={<UserIcon width={18} height={18} />}
            value={o.users.active}
            unit="active"
            detail={`${o.users.total} ${o.users.total === 1 ? "user" : "users"} in total`}
            tags={userTags}
          />
        </Group>

        <Group id="security-heading" title="Security">
          <HubCard
            href="/admin/sessions"
            title="Active sessions"
            text="Who is signed in right now. Sessions end at midnight."
            icon={<ShieldIcon width={18} height={18} />}
            value={o.sessions.active}
            unit="signed in"
            detail="Signed out automatically at midnight"
            tags={o.sessions.active > 0 ? [{ label: "Live", tone: "success" }] : []}
          />
          <HubCard
            href="/admin/activity"
            title="Activity log"
            text="Every change with who made it, when and from which IP."
            icon={<ActivityIcon width={18} height={18} />}
            value={o.activity.today}
            unit="today"
            detail={o.activity.today === 1 ? "1 change since midnight" : `${o.activity.today} changes since midnight`}
          />
        </Group>
      </PageBody>
    </>
  );
}
