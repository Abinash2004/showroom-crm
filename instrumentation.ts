export async function register(): Promise<void> {
  // Validate env when the server boots (skipped during `next build`, where secrets may be absent).
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PHASE !== "phase-production-build") {
    const { getEnv } = await import("@/lib/env");
    getEnv();
  }
}
