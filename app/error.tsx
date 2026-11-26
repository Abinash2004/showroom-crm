"use client";

import { useEffect } from "react";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-muted">The request failed. Try again, and contact your administrator if it keeps happening.</p>
      {error.digest ? <p className="text-xs text-muted">Reference: {error.digest}</p> : null}
      <button type="button" onClick={reset} className="press inline-flex min-h-12 items-center rounded-full bg-primary px-6 font-medium text-on-primary">
        Try again
      </button>
    </main>
  );
}