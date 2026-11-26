import { BottomNav } from "@/components/layout/bottom-nav";
import { PullToRefresh } from "@/components/layout/pull-to-refresh";
import { requireActor } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireActor();
  return (
    <>
      <BottomNav isAdmin={actor.isAdmin} />
      <div className="md:pl-24">
        <PullToRefresh>
          <div id="main" tabIndex={-1} className="pb-[calc(5rem+env(safe-area-inset-bottom))] outline-none md:pb-10">
            {children}
          </div>
        </PullToRefresh>
      </div>
    </>
  );
}