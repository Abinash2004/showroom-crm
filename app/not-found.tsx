import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-muted">The page does not exist or you do not have access to it.</p>
      <Link href="/leads" className="press inline-flex min-h-12 items-center rounded-full bg-primary px-6 font-medium text-on-primary">
        Go to leads
      </Link>
    </main>
  );
}