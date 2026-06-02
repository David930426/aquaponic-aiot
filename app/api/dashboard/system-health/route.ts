import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const zoneId = req.nextUrl.searchParams.get("zoneId") ?? "zone-001";

  const devices = await prisma.device.findMany({ where: { zoneId } });
  const total = devices.length || 1;

  const sensors = devices.filter((d) => d.deviceType.startsWith("sensor_"));
  const sensorsOnline = sensors.filter((d) => d.status !== "offline").length;

  // Weighted health score across signals
  const healthyStates = new Set([
    "running",
    "active",
    "on",
    "scheduled",
    "calibrating",
  ]);
  const healthy = devices.filter((d) => healthyStates.has(d.status)).length;
  const online = devices.filter((d) => d.status !== "offline").length;
  const percent = Math.round(((healthy / total) * 0.6 + (online / total) * 0.4) * 100);

  const pump = devices.find((d) => d.deviceType === "pump");
  const pumpStatus = pump?.isEnabled ? "Active" : "Idle";

  const overallLabel =
    percent >= 90 ? "Excellent" : percent >= 75 ? "Good" : percent >= 50 ? "Fair" : "Poor";

  return NextResponse.json({
    zoneId,
    percent,
    overallLabel,
    sensorsOnline,
    sensorsTotal: sensors.length,
    pumpStatus,
  });
}
