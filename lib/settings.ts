// Runtime app settings stored in the `Setting` collection as JSON-encoded
// key-value pairs. Defaults are baked in below and merged at read time, so
// the app boots cleanly even before anything has been written to the DB.

import { prisma } from "./prisma";

// "passive" = nothing auto-generates readings.
// "live"    = the data engine runs: each device is fetched from its own
//             apiUrl, falling back to its simulator params when the URL is
//             absent or the fetch fails. (API config now lives per-device.)
export type DataSource = "passive" | "live";

export interface AppSettings {
  /** Where readings come from. */
  dataSource: DataSource;
  /** How often the data engine polls/simulates one round of readings (sec). */
  pollIntervalSec: number;
  /** How often the client charts/lists refetch (sec). Bell stays at 10s. */
  chartRefreshSec: number;
  /** How many days raw SensorReading rows are kept (rest auto-pruned). */
  sensorRetentionDays: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  dataSource: "passive",
  pollIntervalSec: 30,
  chartRefreshSec: 15,
  sensorRetentionDays: 30,
};

/** Map any stored/legacy dataSource value onto the current two-mode model. */
function normalizeDataSource(value: unknown): DataSource {
  if (value === "passive") return "passive";
  // Legacy "simulator"/"external" (and "live") all mean the engine is on.
  if (value === "live" || value === "simulator" || value === "external") {
    return "live";
  }
  return DEFAULT_SETTINGS.dataSource;
}

const KEY = "app";

export async function getSettings(): Promise<AppSettings> {
  const row = await prisma.setting.findUnique({ where: { key: KEY } });
  if (!row) return { ...DEFAULT_SETTINGS };
  try {
    const parsed = JSON.parse(row.value) as Partial<AppSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      dataSource: normalizeDataSource(parsed.dataSource),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function updateSettings(
  patch: Partial<AppSettings>,
): Promise<AppSettings> {
  const current = await getSettings();
  const next: AppSettings = { ...current, ...patch };
  await prisma.setting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: JSON.stringify(next) },
    update: { value: JSON.stringify(next) },
  });
  return next;
}
