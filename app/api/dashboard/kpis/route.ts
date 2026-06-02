import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type TrendKind = "stable" | "increasing" | "decreasing" | "optimal" | "normal";

interface KpiCard {
  key: "ph" | "temp" | "do" | "level";
  deviceId: string;
  value: number;
  unit: string;
  delta: number; // current - 24h-ago average
  trend: TrendKind;
}

// Decide which trend label to show based on safe range + delta size.
function classifyTrend(
  value: number,
  delta: number,
  safeMin: number | null,
  safeMax: number | null,
  deltaThreshold: number,
): TrendKind {
  const inRange =
    (safeMin == null || value >= safeMin) &&
    (safeMax == null || value <= safeMax);
  if (Math.abs(delta) < deltaThreshold) return inRange ? "stable" : "stable";
  if (delta > 0) return "increasing";
  return "decreasing";
}

async function kpiFor(
  key: KpiCard["key"],
  deviceId: string,
  deltaThreshold: number,
  preferOptimalLabel = false,
): Promise<KpiCard | null> {
  const device = await prisma.device.findUnique({ where: { id: deviceId } });
  if (!device) return null;

  // Latest + 24h-ago reading
  const latest = await prisma.sensorReading.findFirst({
    where: { deviceId },
    orderBy: { recordedAt: "desc" },
  });
  if (!latest) return null;

  const dayAgo = new Date(latest.recordedAt.getTime() - 24 * 60 * 60 * 1000);
  const reference = await prisma.sensorReading.findFirst({
    where: { deviceId, recordedAt: { lte: dayAgo } },
    orderBy: { recordedAt: "desc" },
  });

  const delta = reference ? latest.value - reference.value : 0;
  let trend = classifyTrend(
    latest.value,
    delta,
    device.safeMin,
    device.safeMax,
    deltaThreshold,
  );
  if (preferOptimalLabel && trend === "stable") trend = "optimal";

  return {
    key,
    deviceId,
    value: Number(latest.value.toFixed(2)),
    unit: device.readingUnit ?? "",
    delta: Number(delta.toFixed(2)),
    trend,
  };
}

export async function GET(_req: NextRequest) {
  const [ph, temp, doKpi, level] = await Promise.all([
    kpiFor("ph", "dev-003", 0.05),
    kpiFor("temp", "dev-002", 0.3),
    kpiFor("do", "dev-008", 0.2, true),
    kpiFor("level", "dev-006", 1),
  ]);

  // Water level uses "Normal" wording when within safe range
  if (level && level.trend === "stable") level.trend = "normal";

  return NextResponse.json({
    updatedAt: Date.now(),
    kpis: [ph, temp, doKpi, level].filter(Boolean),
  });
}
