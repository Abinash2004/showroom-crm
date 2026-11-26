import type { Metadata } from "next";
import { AppBar } from "@/components/layout/app-bar";
import { PageBody } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { logoutAction } from "@/lib/actions/auth";
import { requireActor } from "@/lib/auth/session";
import { listBranches } from "@/lib/db/repositories/branches";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const actor = await requireActor();
  const branches = await listBranches(actor);
  return (
    <>
      <AppBar title="Account" backHref="/leads" />
      <PageBody>
        <Card className="space-y-3">
          <p className="text-lg font-semibold">{actor.name}</p>
          <p className="text-sm text-muted">{actor.isAdmin ? "Administrator" : "Sales user"}</p>
          <p className="text-sm">
            <span className="text-muted">Branches: </span>
            {branches.length ? branches.map((b) => b.name).join(", ") : "None assigned"}
          </p>
          <p className="text-sm text-muted">Your session ends automatically at midnight (IST).</p>
        </Card>
        <form action={logoutAction}>
          <Button type="submit" variant="outline" className="w-full">
            Sign out
          </Button>
        </form>
      </PageBody>
    </>
  );
}