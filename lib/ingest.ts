// Sensor-reading ingest pipeline.
// Used by both the per-sensor REST routes and the in-process simulator.

import { prisma } from "./prisma";
import { getThresholdSettings, isSensorMetric } from "./thresholds";

export interface IngestReading {
  /** Device document id (e.g. "dev-003"). */
  deviceId: string;
  /** Numeric value of the reading. */
  value: number;
  /** Optional unit override (defaults to the device's stored readingUnit). */
  unit?: string;
  /** ISO timestamp; omit to use now. */
  recordedAt?: string;
}

export interface IngestResult {
  deviceId: string;
  stored: boolean;
  isAnomaly: boolean;
  severity?: "warning" | "critical";
  message?: string;
  error?: string;
}

/**
 * Persist a reading, update the parent device's "current reading" snapshot,
 * and (if the value breaches its safe range) record an anomaly + alert.
 */
export async function ingestReading(r: IngestReading): Promise<IngestResult> {
  const device = await prisma.device.findUnique({ where: { id: r.deviceId } });
  if (!device) {
    return {
      deviceId: r.deviceId,
      stored: false,
      isAnomaly: false,
      error: "DEVICE_NOT_FOUND",
    };
  }
  if (!Number.isFinite(r.value)) {
    return {
      deviceId: r.deviceId,
      stored: false,
      isAnomaly: false,
      error: "INVALID_VALUE",
    };
  }

  const recordedAt = r.recordedAt ? new Date(r.recordedAt) : new Date();
  const unit = r.unit ?? device.readingUnit ?? "";

  // 1. Persist the raw reading (auto-pruned by TTL index)
  await prisma.sensorReading.create({
    data: { deviceId: device.id, value: r.value, unit, recordedAt },
  });

  // 2. Update the device's current snapshot
  const formatted = formatReading(r.value, unit);
  await prisma.device.update({
    where: { id: device.id },
    data: { readingRaw: r.value, readingValue: formatted },
  });

  // 3. Resolve thresholds: per-device override first, then global metric default.
  const thresholds = await getThresholdSettings();
  let safeMin = device.safeMin;
  let safeMax = device.safeMax;
  if ((safeMin == null || safeMax == null) && isSensorMetric(device.deviceType)) {
    const fallback = thresholds.defaults[device.deviceType];
    safeMin = safeMin ?? fallback.min;
    safeMax = safeMax ?? fallback.max;
  }

  // 4. Anomaly detection
  const deltaFactor = Math.max(0, thresholds.criticalDeltaPercent) / 100;
  const { breach, severity } = classify(r.value, safeMin, safeMax, deltaFactor);

  if (!breach) {
    return { deviceId: device.id, stored: true, isAnomaly: false };
  }

  // Anomaly path: create alert + anomaly record (both kept forever)
  const message = buildAnomalyMessage(
    device.name,
    r.value,
    unit,
    safeMin,
    safeMax,
  );

  const alert = await prisma.alert.create({
    data: {
      zoneId: device.zoneId,
      deviceId: device.id,
      deviceName: device.name,
      severity,
      message,
      isRead: false,
      isResolved: false,
      triggeredAt: recordedAt,
    },
  });

  await prisma.sensorAnomaly.create({
    data: {
      deviceId: device.id,
      value: r.value,
      unit,
      safeMin,
      safeMax,
      severity,
      alertId: alert.id,
      recordedAt,
    },
  });

  return {
    deviceId: device.id,
    stored: true,
    isAnomaly: true,
    severity,
    message,
  };
}

function classify(
  value: number,
  safeMin: number | null,
  safeMax: number | null,
  deltaFactor: number,
): { breach: boolean; severity: "warning" | "critical" } {
  if (safeMin == null && safeMax == null) {
    return { breach: false, severity: "warning" };
  }
  const range = (safeMax ?? value) - (safeMin ?? value);
  const margin = Math.abs(range * deltaFactor) || 0;

  if (safeMax != null && value > safeMax) {
    return {
      breach: true,
      severity: value > safeMax + margin ? "critical" : "warning",
    };
  }
  if (safeMin != null && value < safeMin) {
    return {
      breach: true,
      severity: value < safeMin - margin ? "critical" : "warning",
    };
  }
  return { breach: false, severity: "warning" };
}

function formatReading(value: number, unit: string): string {
  if (unit === "°C") return `${value.toFixed(1)}°C`;
  if (unit === "%") return `${Math.round(value)}%`;
  if (unit === "mg/L") return `${value.toFixed(1)} mg/L`;
  if (unit === "L/min") return `${value.toFixed(1)} L/min`;
  if (unit === "") {
    // pH-style — show with one decimal
    return value.toFixed(1);
  }
  return `${value}${unit}`;
}

function buildAnomalyMessage(
  name: string,
  value: number,
  unit: string,
  min: number | null,
  max: number | null,
): string {
  const v = formatReading(value, unit);
  if (max != null && value > max) {
    return `${name} reading ${v} exceeds safe maximum ${max}${unit}`;
  }
  if (min != null && value < min) {
    return `${name} reading ${v} fell below safe minimum ${min}${unit}`;
  }
  return `${name} reading ${v} is outside safe range`;
}
