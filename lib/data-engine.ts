// Unified server-side data engine.
//
// When dataSource === "live", every `pollIntervalSec` we walk each enabled
// sensor device and produce one reading for it:
//   • If the device has an apiUrl → HTTP GET it and use the returned value.
//   • If the URL is empty OR the fetch fails/returns junk → fall back to
//     simulating a realistic value from the device's sim* params.
// Either way the value flows through the same ingestReading() pipeline the
// push API uses, so charts/anomalies behave identically. Readings are stamped
// with the fetch/tick time (recordedAt defaults to now in ingestReading).
//
// This replaces the old lib/simulator.ts + lib/poller.ts.

import { ingestReading } from "./ingest";
import { prisma } from "./prisma";
import { getSettings } from "./settings";
import { isSensorMetric, type SensorMetric } from "./thresholds";

interface SimProfile {
  baseline: number;
  amplitude: number; // diurnal swing
  noise: number;
}

// Fallback simulator profile per metric, used when a device hasn't set its
// own sim* params. Matches the original hardcoded simulator behaviour.
const DEFAULT_SIM: Record<SensorMetric, SimProfile> = {
  sensor_temp: { baseline: 22, amplitude: 3, noise: 0.4 },
  sensor_ph: { baseline: 7.1, amplitude: 0.3, noise: 0.1 },
  sensor_level: { baseline: 82, amplitude: 6, noise: 1.5 },
  sensor_do: { baseline: 8.2, amplitude: 1.5, noise: 0.25 },
  sensor_flow: { baseline: 35, amplitude: 8, noise: 2 },
};

let timer: NodeJS.Timeout | null = null;
let currentIntervalSec = 0;
let ticking = false;

/** Diurnal sine wave shared by every simulated device. */
function diurnalWave(): number {
  const now = Date.now();
  const dayPhase = ((now / 1000 / 60 / 60) % 24) / 24;
  return Math.sin(dayPhase * 2 * Math.PI);
}

function simulateValue(
  deviceType: SensorMetric,
  device: {
    simBaseline: number | null;
    simAmplitude: number | null;
    simNoise: number | null;
  },
): number {
  const def = DEFAULT_SIM[deviceType];
  const baseline = device.simBaseline ?? def.baseline;
  const amplitude = device.simAmplitude ?? def.amplitude;
  const noise = device.simNoise ?? def.noise;
  return baseline + diurnalWave() * amplitude + (Math.random() - 0.5) * noise * 2;
}

/**
 * Pull a numeric value out of whatever the per-device API returned. Forgiving
 * on purpose so a class gateway can return the easiest shape:
 *   42.1                       → 42.1
 *   { "value": 42.1 }          → 42.1
 *   { "value": 42.1, "unit": "°C" }
 *   { "temp": 42.1 }           → 42.1  (first finite numeric field)
 */
export function extractValue(
  payload: unknown,
): { value: number; unit?: string } | null {
  if (typeof payload === "number" && Number.isFinite(payload)) {
    return { value: payload };
  }
  if (typeof payload === "string") {
    const n = Number(payload);
    return Number.isFinite(n) ? { value: n } : null;
  }
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    const unit = typeof obj.unit === "string" ? obj.unit : undefined;
    const direct = typeof obj.value === "string" ? Number(obj.value) : obj.value;
    if (typeof direct === "number" && Number.isFinite(direct)) {
      return { value: direct, unit };
    }
    // Otherwise use the first finite numeric property.
    for (const v of Object.values(obj)) {
      const n = typeof v === "string" ? Number(v) : v;
      if (typeof n === "number" && Number.isFinite(n)) {
        return { value: n, unit };
      }
    }
  }
  return null;
}

async function fetchDeviceValue(
  apiUrl: string,
  apiToken: string | null,
): Promise<{ value: number; unit?: string } | null> {
  try {
    const res = await fetch(apiUrl, {
      headers: apiToken ? { Authorization: `Bearer ${apiToken}` } : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      console.warn(`[engine] GET ${apiUrl} → HTTP ${res.status}`);
      return null;
    }
    const payload = await res.json().catch(() => null);
    return extractValue(payload);
  } catch (err) {
    console.warn(`[engine] fetch failed for ${apiUrl}:`, (err as Error).message);
    return null;
  }
}

async function tick() {
  if (ticking) return; // don't overlap if a slow round is still in flight
  ticking = true;
  try {
    const devices = await prisma.device.findMany({
      where: { isEnabled: true },
    });

    for (const d of devices) {
      if (!isSensorMetric(d.deviceType)) continue;

      // 1. Try the device's own API first.
      let result: { value: number; unit?: string } | null = null;
      if (d.apiUrl) {
        result = await fetchDeviceValue(d.apiUrl, d.apiToken);
      }

      // 2. Fall back to simulation when there's no URL or it didn't work.
      const value = result
        ? result.value
        : simulateValue(d.deviceType, d);

      try {
        await ingestReading({
          deviceId: d.id,
          value,
          unit: result?.unit,
        });
      } catch (err) {
        console.error(`[engine] ingest failed for ${d.id}:`, err);
      }
    }
  } catch (err) {
    console.error("[engine] tick failed:", err);
  } finally {
    ticking = false;
  }
}

/**
 * Reconcile the engine's running state with current settings. Called from the
 * scheduler's resync loop, so flipping dataSource / pollIntervalSec in the UI
 * takes effect within ~60 seconds.
 */
export async function syncDataEngine() {
  const s = await getSettings();
  const wantEnabled = s.dataSource === "live";
  const wantIntervalSec = Math.max(5, s.pollIntervalSec);

  if (!wantEnabled) {
    if (timer) {
      clearInterval(timer);
      timer = null;
      currentIntervalSec = 0;
      console.log("[engine] stopped");
    }
    return;
  }

  if (timer && currentIntervalSec === wantIntervalSec) return; // already correct

  if (timer) clearInterval(timer);
  currentIntervalSec = wantIntervalSec;
  timer = setInterval(tick, wantIntervalSec * 1000);
  void tick(); // fire one immediately
  console.log(`[engine] live, every ${wantIntervalSec}s`);
}
