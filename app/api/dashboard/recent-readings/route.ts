import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Per-minute live readings, used by the data-testing sandbox.
// Returns ALL sensor devices' last `minutes` of raw readings, keyed by device.
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const minutes = Math.max(
    1,
    Math.min(720, Number(params.get("minutes") ?? "30")),
  );
  const zoneId = params.get("zoneId") ?? "zone-001";
  const since = new Date(Date.now() - minutes * 60 * 1000);

  const devices = await prisma.device.findMany({
    where: {
      zoneId,
      deviceType: {
        in: ["sensor_temp", "sensor_ph", "sensor_level", "sensor_do"],
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const rows = await prisma.sensorReading.findMany({
    where: {
      deviceId: { in: devices.map((d) => d.id) },
      recordedAt: { gte: since },
    },
    orderBy: { recordedAt: "asc" },
  });

  return NextResponse.json({
    minutes,
    devices: devices.map((d) => ({
      id: d.id,
      name: d.name,
      deviceType: d.deviceType,
      unit: d.readingUnit ?? "",
    })),
    readings: rows.map((r) => ({
      ts: r.recordedAt.getTime(),
      deviceId: r.deviceId,
      value: r.value,
    })),
  });
}
