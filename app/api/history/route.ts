import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("deviceId");
  const hours = Number(req.nextUrl.searchParams.get("hours") ?? "24");

  if (!deviceId) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "deviceId is required" },
      { status: 400 },
    );
  }

  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const readings = await prisma.sensorReading.findMany({
    where: { deviceId, recordedAt: { gte: since } },
    orderBy: { recordedAt: "asc" },
  });

  return NextResponse.json({
    deviceId,
    readings: readings.map((r) => ({
      t: r.recordedAt.toISOString(),
      v: Number(r.value.toFixed(2)),
      unit: r.unit,
    })),
  });
}
