// Runs once per Node server startup (App Router instrumentation hook).
// Only fires in the Node runtime, NOT during build or in Edge functions.

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Lazy import so build / edge runs never pull these modules
  const { startScheduler } = await import("./lib/scheduler");
  await startScheduler();
}
