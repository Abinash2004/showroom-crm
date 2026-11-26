export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-8 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(2rem+env(safe-area-inset-top))]"
    >
      <div className="flex items-center justify-center gap-2.5">
        <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-full bg-primary font-display text-lg font-bold text-white">
          S
        </span>
        <span className="font-display text-2xl tracking-tight">
          Showroom <span className="font-bold">CRM</span>
        </span>
      </div>
      <div className="rounded-[28px] bg-surface p-6 shadow-sheet sm:p-7">{children}</div>
    </main>
  );
}
