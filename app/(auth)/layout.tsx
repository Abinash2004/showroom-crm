import { LiveWheelMark, NavigationBusyWatcher } from "@/components/layout/busy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-8 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(2rem+env(safe-area-inset-top))]"
    >
      {/* No app bar here, so the logo is the loader: static at rest, rolling while sign-in/sign-up is pending. */}
      <NavigationBusyWatcher />
      <div className="flex items-center justify-center gap-2.5">
        <LiveWheelMark className="size-10" />
        <span className="font-display text-2xl tracking-tight">
          Showroom <span className="font-bold">CRM</span>
        </span>
      </div>
      <div className="rounded-[28px] bg-surface p-6 shadow-sheet sm:p-7">{children}</div>
    </main>
  );
}
