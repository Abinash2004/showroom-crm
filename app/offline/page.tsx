import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">You are offline</h1>
      <p className="text-muted">
        Lead data is not stored on this device. Reconnect to the internet and reload to continue.
      </p>
      <Link
        href="/leads"
        className="press inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-6 font-medium text-on-primary"
      >
        Try again
      </Link>
    </main>
  );
}
