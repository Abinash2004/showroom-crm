import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppBar } from "@/components/layout/app-bar";
import { PageBody } from "@/components/layout/page";
import { InteractionItem } from "@/components/leads/interaction-item";
import { LogInteractionSheet } from "@/components/leads/lead-actions";
import { LeadEditor } from "@/components/leads/lead-editor";
import { EmptyState } from "@/components/ui/card";
import { requireActor } from "@/lib/auth/session";
import { listBranches } from "@/lib/db/repositories/branches";
import { getLead } from "@/lib/db/repositories/leads";
import { listInteractionsForLead } from "@/lib/db/repositories/interactions";
import { todayInputDate } from "@/lib/format";
import { objectIdSchema } from "@/lib/validators/common";

export const metadata: Metadata = { title: "Lead Information" };
export const runtime = "nodejs";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  const parsedId = objectIdSchema.safeParse((await params).id);
  if (!parsedId.success) notFound();
  const lead = await getLead(actor, parsedId.data);
  if (!lead) notFound();
  const [interactions, branches] = await Promise.all([listInteractionsForLead(actor, lead.id), listBranches(actor)]);
  // Choices for moving the lead: the actor's active branches, plus its current branch even if inactive.
  const branchOptions = branches
    .filter((b) => b.isActive || b.id === lead.branchId)
    .map((b) => ({ id: b.id, name: b.name, location: b.location, isActive: b.isActive }));
  if (!branchOptions.some((b) => b.id === lead.branchId)) {
    branchOptions.unshift({ id: lead.branchId, name: lead.branchName, location: "", isActive: true });
  }
  const today = todayInputDate();

  return (
    <>
      <AppBar title="Lead Information" backHref="/leads" />
      <PageBody className="space-y-5">
        <LeadEditor lead={lead} branches={branchOptions} today={today} />

        <section aria-labelledby="history-heading" className="space-y-3">
          <div className="flex min-h-12 items-center justify-between gap-3">
            <h2 id="history-heading" className="flex items-center gap-2 text-base font-semibold">
              Interactions
              <span className="rounded-full bg-neutral-soft px-2.5 py-0.5 text-xs font-semibold tabular-nums text-on-neutral-soft">
                {interactions.length}
              </span>
            </h2>
            <LogInteractionSheet leadId={lead.id} today={today} />
          </div>
          {interactions.length === 0 ? (
            <EmptyState title="No interactions yet">Tap Log interaction after you talk to the customer.</EmptyState>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {interactions.map((i) => (
                <InteractionItem key={i.id} interaction={i} today={today} />
              ))}
            </ul>
          )}
        </section>

        {/* Keeps the last card clear of the floating Log interaction button on phones. */}
        <div aria-hidden="true" className="h-16 md:hidden" />
      </PageBody>
    </>
  );
}
