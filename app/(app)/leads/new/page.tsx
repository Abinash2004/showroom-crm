import type { Metadata } from "next";
import { AppBar } from "@/components/layout/app-bar";
import { PageBody } from "@/components/layout/page";
import { LeadForm } from "@/components/leads/lead-form";
import { EmptyState } from "@/components/ui/card";
import { requireActor } from "@/lib/auth/session";
import { listBranches } from "@/lib/db/repositories/branches";
import { todayInputDate } from "@/lib/format";

export const metadata: Metadata = { title: "New lead" };

export default async function NewLeadPage() {
  const actor = await requireActor();
  const branches = await listBranches(actor, { activeOnly: true });
  return (
    <>
      <AppBar title="New lead" backHref="/leads" />
      <PageBody>
        {branches.length === 0 ? (
          <EmptyState title="No active branch available">Ask an administrator to assign you to an active branch.</EmptyState>
        ) : (
          <LeadForm branches={branches} today={todayInputDate()} />
        )}
      </PageBody>
    </>
  );
}