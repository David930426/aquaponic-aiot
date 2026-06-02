// Runtime app settings stored in the `Setting` collection as JSON-encoded
// key-value pairs. Defaults are baked in below and merged at read time, so
// the app boots cleanly even before anything has been written to the DB.

import { prisma } from "./prisma";

export type DataSource = "simulator" | "external" | "passive";

export interface AppSettings {
  /** Where readings come from. */
  dataSource: DataSource;
  /** URL the server polls when dataSource === "external". */
  externalApiUrl: string;
  /** Optional bearer token sent to the external API. */
  externalApiToken: string;
  /** How often the server-side simulator generates fake readings (sec). */
  simulatorIntervalSec: number;
  /** How often the client charts/lists refetch (sec). Bell stays at 10s. */
  chartRefreshSec: number;
  /** How many days raw SensorReading rows are kept (rest auto-pruned). */
  sensorRetentionDays: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  dataSource: "passive",
  externalApiUrl: "",
  externalApiToken: "",
  simulatorIntervalSec: 5,
  chartRefreshSec: 15,
  sensorRetentionDays: 30,
};

const KEY = "app";

export async function getSettings(): Promise<AppSettings> {
  const row = await prisma.setting.findUnique({ where: { key: KEY } });
  if (!row) return { ...DEFAULT_SETTINGS };
  try {
    const parsed = JSON.parse(row.value) as Partial<AppSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
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
