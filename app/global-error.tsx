"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 24, textAlign: "center" }}>
        <h1>Something went wrong</h1>
        <button type="button" onClick={reset} style={{ minHeight: 48, padding: "0 24px" }}>
          Reload
        </button>
      </body>
    </html>
  );
}