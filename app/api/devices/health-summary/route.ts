import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import type { HealthSummaryResponse } from "@/types/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const zoneId = req.nextUrl.searchParams.get("zoneId") ?? "zone-001";

  const devices = await prisma.device.findMany({ where: { zoneId } });
  const total = devices.length || 1;

  // System Status — share of devices in healthy (non-idle, non-offline) state.
  const healthyStates = new Set([
    "running",
    "active",
    "on",
    "scheduled",
    "calibrating",
  ]);
  const healthyCount = devices.filter((d) => healthyStates.has(d.status)).length;
  const systemPercent = Math.round((healthyCount / total) * 100);

  // Sensor Health — share of sensor devices currently `active` (not calibrating / offline).
  const sensors = devices.filter((d) => d.deviceType.startsWith("sensor_"));
  const sensorTotal = sensors.length || 1;
  const sensorsHealthy = sensors.filter((d) => d.status === "active").length;
  const sensorPercent = Math.round((sensorsHealthy / sensorTotal) * 100);

  // Connection Stability — % devices NOT offline (mocked stable for demo).
  const onlineCount = devices.filter((d) => d.status !== "offline").length;
  const connectionPercent = Math.round((onlineCount / total) * 100);

  const labelFor = (p: number, kind: "system" | "sensor" | "conn") => {
    if (kind === "conn") return p >= 95 ? "Strong" : p >= 80 ? "Stable" : "Weak";
    return p >= 90 ? "Optimal" : p >= 75 ? "Good" : p >= 50 ? "Fair" : "Poor";
  };
  const stateFor = (p: number, kind: "system" | "sensor" | "conn") => {
    if (kind === "conn") return p >= 95 ? "strong" : p >= 80 ? "good" : "warning";
    return p >= 90 ? "optimal" : p >= 75 ? "good" : "warning";
  };

  const body: HealthSummaryResponse = {
    zoneId,
    updatedAt: Date.now(),
    summary: [
      {
        key: "system_status",
        label: "System Status",
        value: `${labelFor(systemPercent, "system")} (${systemPercent}%)`,
        percent: systemPercent,
        state: stateFor(systemPercent, "system") as
          | "optimal"
          | "good"
          | "warning",
      },
      {
        key: "sensor_health",
        label: "Sensor Health",
        value: `${labelFor(sensorPercent, "sensor")} (${sensorPercent}%)`,
        percent: sensorPercent,
        state: stateFor(sensorPercent, "sensor") as
          | "optimal"
          | "good"
          | "warning",
      },
      {
        key: "connection_stability",
        label: "Connection Stability",
        value: `${labelFor(connectionPercent, "conn")} (${connectionPercent}%)`,
        percent: connectionPercent,
        state: stateFor(connectionPercent, "conn") as
          | "strong"
          | "good"
          | "warning",
      },
    ],
  };

  return NextResponse.json(body);
}
