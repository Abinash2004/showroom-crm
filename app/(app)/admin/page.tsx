import type { Metadata } from "next";
import Link from "next/link";
import { AppBar } from "@/components/layout/app-bar";
import { PageBody } from "@/components/layout/page";
import { ChevronRightIcon, ListIcon, ShieldIcon, StoreIcon, UserIcon } from "@/components/icons";
import { requireAdminPage } from "@/lib/auth/session";
import { adminOverview } from "@/lib/db/repositories/admin";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Admin" };
export const runtime = "nodejs";

type Tone = "neutral" | "warn" | "danger" | "success";

const TONES: Record<Tone, string> = {
  neutral: "bg-neutral-soft text-on-neutral-soft",
  warn: "bg-warn-soft text-on-warn-soft",
  danger: "bg-danger-soft text-on-danger-soft",
  success: "bg-success-soft text-on-success-soft",
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
  /** Headline number and what it counts, e.g. 3 / "active of 4". */
  value: number;
  unit: string;
  tags?: Tag[];
}

function HubCard({ href, title, text, icon, value, unit, tags = [] }: HubCardProps) {
  return (
    <li className="min-w-0">
      <Link href={href} className="press flex h-full min-h-12 flex-col gap-3 rounded-card bg-surface p-4 shadow-card">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-on-primary-soft">
            {icon}
          </span>
          <h3 className="min-w-0 flex-1 truncate text-base font-semibold">{title}</h3>
          <ChevronRightIcon aria-hidden="true" width={20} height={20} className="shrink-0 text-muted" />
        </div>
        <p className="flex items-baseline gap-1.5">
          <span className="text-3xl font-semibold tabular-nums leading-none">{value}</span>
          <span className="text-sm text-muted">{unit}</span>
        </p>
        <p className="text-sm text-muted">{text}</p>
        {/* Pushed to the bottom so cards in a row line up even when only some have tags. */}
        {tags.length > 0 ? (
          <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
            {tags.map((t) => (
              <span key={t.label} className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", TONES[t.tone])}>
                {t.label}
              </span>
            ))}
          </div>
        ) : null}
      </Link>
    </li>
  );
}

function Group({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="px-1 text-xs font-semibold uppercase tracking-wider text-muted">
        {title}
      </h2>
      <ul className="grid gap-3 md:grid-cols-2">{children}</ul>
    </section>
  );
}

export default async function AdminPage() {
  const actor = await requireAdminPage();
  const o = await adminOverview(actor);
  const inactiveBranches = o.branches.total - o.branches.active;
  const inactiveUsers = o.users.total - o.users.active;

  const userTags: Tag[] = [];
  if (o.users.pendingSignup > 0) userTags.push({ label: `${o.users.pendingSignup} sign-up pending`, tone: "warn" });
  if (o.users.locked > 0) userTags.push({ label: `${o.users.locked} locked`, tone: "danger" });
  if (inactiveUsers > 0) userTags.push({ label: `${inactiveUsers} inactive`, tone: "neutral" });

  return (
    <>
      <AppBar title="Admin" />
      <PageBody className="space-y-6">
        <Group id="org-heading" title="Organization">
          <HubCard
            href="/admin/branches"
            title="Branches"
            text="Create showroom locations and switch them on or off."
            icon={<StoreIcon width={22} height={22} />}
            value={o.branches.active}
            unit={`active of ${o.branches.total}`}
            tags={inactiveBranches > 0 ? [{ label: `${inactiveBranches} inactive`, tone: "neutral" }] : []}
          />
          <HubCard
            href="/admin/users"
            title="Users"
            text="Register employees, assign branches and deactivate access."
            icon={<UserIcon width={22} height={22} />}
            value={o.users.active}
            unit={`active of ${o.users.total}`}
            tags={userTags}
          />
        </Group>

        <Group id="security-heading" title="Security">
          <HubCard
            href="/admin/sessions"
            title="Active sessions"
            text="Who is signed in right now. Sessions end at midnight."
            icon={<ShieldIcon width={22} height={22} />}
            value={o.sessions.active}
            unit="signed in now"
            tags={o.sessions.active > 0 ? [{ label: "Live", tone: "success" }] : []}
          />
          <HubCard
            href="/admin/activity"
            title="Activity log"
            text="Every change with who made it, when and from which IP."
            icon={<ListIcon width={22} height={22} />}
            value={o.activity.today}
            unit={o.activity.today === 1 ? "change today" : "changes today"}
          />
        </Group>
      </PageBody>
    </>
  );
}
