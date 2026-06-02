// Global per-metric threshold defaults, stored in the Setting collection.
// Devices keep their own safeMin/safeMax overrides on the Device row.
// When ingesting a reading, we resolve thresholds as:
//   device.safeMin/safeMax  >>  metricDefaults[deviceType]  >>  null
//
// The "criticalDeltaPercent" controls how far past the safe range a value
// must go before the alert is upgraded from warning → critical.

import { prisma } from "./prisma";

export type SensorMetric =
  | "sensor_temp"
  | "sensor_ph"
  | "sensor_level"
  | "sensor_do";

export interface MetricThreshold {
  min: number;
  max: number;
}

export interface ThresholdSettings {
  defaults: Record<SensorMetric, MetricThreshold>;
  criticalDeltaPercent: number;
}

export type ThresholdSettingsPatch = {
  defaults?: Partial<Record<SensorMetric, MetricThreshold>>;
  criticalDeltaPercent?: number;
};

export const SENSOR_METRICS: SensorMetric[] = [
  "sensor_temp",
  "sensor_ph",
  "sensor_level",
  "sensor_do",
];

export const DEFAULT_THRESHOLDS: ThresholdSettings = {
  defaults: {
    sensor_temp: { min: 18, max: 25 },
    sensor_ph: { min: 6.5, max: 7.5 },
    sensor_level: { min: 60, max: 95 },
    sensor_do: { min: 5, max: 12 },
  },
  criticalDeltaPercent: 10,
};

const KEY = "thresholds";

export async function getThresholdSettings(): Promise<ThresholdSettings> {
  const row = await prisma.setting.findUnique({ where: { key: KEY } });
  if (!row) return cloneDefaults();
  try {
    const parsed = JSON.parse(row.value) as Partial<ThresholdSettings>;
    return {
      defaults: { ...DEFAULT_THRESHOLDS.defaults, ...(parsed.defaults ?? {}) },
      criticalDeltaPercent:
        parsed.criticalDeltaPercent ?? DEFAULT_THRESHOLDS.criticalDeltaPercent,
    };
  } catch {
    return cloneDefaults();
  }
}

export async function updateThresholdSettings(
  patch: ThresholdSettingsPatch,
): Promise<ThresholdSettings> {
  const current = await getThresholdSettings();
  const next: ThresholdSettings = {
    defaults: { ...current.defaults, ...(patch.defaults ?? {}) },
    criticalDeltaPercent:
      patch.criticalDeltaPercent ?? current.criticalDeltaPercent,
  };
  await prisma.setting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: JSON.stringify(next) },
    update: { value: JSON.stringify(next) },
  });
  return next;
}

function cloneDefaults(): ThresholdSettings {
  return {
    defaults: { ...DEFAULT_THRESHOLDS.defaults },
    criticalDeltaPercent: DEFAULT_THRESHOLDS.criticalDeltaPercent,
  };
}

export function isSensorMetric(value: string): value is SensorMetric {
  return SENSOR_METRICS.includes(value as SensorMetric);
}
