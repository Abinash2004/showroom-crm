import { BottomNav } from "@/components/layout/bottom-nav";
import { NavigationBusyWatcher } from "@/components/layout/busy";
import { ViewerProvider } from "@/components/layout/viewer";
import { requireActor } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireActor();
  return (
    <ViewerProvider viewer={{ name: actor.name, isAdmin: actor.isAdmin, branchCount: actor.branchIds.length }}>
      <NavigationBusyWatcher />
      <BottomNav isAdmin={actor.isAdmin} />
      {/* overflow-x-clip: nothing can widen the page past the screen (which would push the fixed dock out of view).
          `clip` doesn't create a scroll container, so sticky headers keep working. */}
      <div className="overflow-x-clip lg:pl-[284px]">
        {/* pb-28 keeps the last card and pagination clear of the floating mobile dock. */}
        <div id="main" tabIndex={-1} className="pb-[calc(7rem+env(safe-area-inset-bottom))] outline-none lg:pb-10">
          {children}
        </div>
      </div>
    </ViewerProvider>
  );
}
