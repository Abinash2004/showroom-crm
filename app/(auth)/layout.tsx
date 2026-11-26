import Image from "next/image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-8 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(2rem+env(safe-area-inset-top))]">
      <div className="flex items-center gap-3">
        <Image src="/pwa-icon/192" alt="Showroom CRM logo" width={48} height={48} priority className="rounded-xl" />
        <span className="text-xl font-semibold">Showroom CRM</span>
      </div>
      <div className="rounded-card bg-surface p-5 shadow-card">{children}</div>
    </main>
  );
}