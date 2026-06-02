// Server-side sensor simulator.
// Generates realistic-looking readings for the four trackable sensors and
// feeds them into the same ingest pipeline that the public API uses, so the
// dashboard chart/anomaly behaviour is identical to real-world data.

import { ingestReading } from "./ingest";
import { getSettings } from "./settings";

interface SimDevice {
  deviceId: string;
  baseline: number;
  amplitude: number; // diurnal swing
  noise: number;
}

// Devices that get simulated. Match the seeded sensor docs.
const SIM_DEVICES: SimDevice[] = [
  { deviceId: "dev-002", baseline: 22, amplitude: 3, noise: 0.4 }, // temp
  { deviceId: "dev-003", baseline: 7.1, amplitude: 0.3, noise: 0.1 }, // ph
  { deviceId: "dev-006", baseline: 82, amplitude: 6, noise: 1.5 }, // level
  { deviceId: "dev-008", baseline: 8.2, amplitude: 1.5, noise: 0.25 }, // DO
];

let timer: NodeJS.Timeout | null = null;
let currentIntervalSec = 0;

async function tick() {
  const now = Date.now();
  const dayPhase = ((now / 1000 / 60 / 60) % 24) / 24;
  const wave = Math.sin(dayPhase * 2 * Math.PI);

  for (const dev of SIM_DEVICES) {
    const value =
      dev.baseline +
      wave * dev.amplitude +
      (Math.random() - 0.5) * dev.noise * 2;
    try {
      await ingestReading({ deviceId: dev.deviceId, value });
    } catch (err) {
      console.error(`[simulator] ingest failed for ${dev.deviceId}:`, err);
    }
  }
}

/**
 * Reconcile the simulator's running state with current settings.
 * Called from the scheduler's resync loop, so changing the data-source
 * setting in the UI takes effect within ~60 seconds.
 */
export async function syncSimulator() {
  const s = await getSettings();
  const wantEnabled = s.dataSource === "simulator";
  const wantIntervalSec = Math.max(1, s.simulatorIntervalSec);

  if (!wantEnabled) {
    if (timer) {
      clearInterval(timer);
      timer = null;
      currentIntervalSec = 0;
      console.log("[simulator] stopped");
    }
    return;
  }

  // Already running at the right pace
  if (timer && currentIntervalSec === wantIntervalSec) return;

  // Restart with the new interval
  if (timer) clearInterval(timer);
  currentIntervalSec = wantIntervalSec;
  timer = setInterval(tick, wantIntervalSec * 1000);
  console.log(`[simulator] running every ${wantIntervalSec}s`);
}
