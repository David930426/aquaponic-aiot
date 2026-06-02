import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const deviceId = params.get("deviceId");
  const days = Math.max(
    1,
    Math.min(365, Number(params.get("days") ?? "7")),
  );
  const limit = Math.max(
    1,
    Math.min(500, Number(params.get("limit") ?? "100")),
  );

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await prisma.sensorAnomaly.findMany({
    where: {
      recordedAt: { gte: since },
      ...(deviceId ? { deviceId } : {}),
    },
    orderBy: { recordedAt: "desc" },
    take: limit,
  });

  return NextResponse.json({
    anomalies: rows.map((a) => ({
      id: a.id,
      deviceId: a.deviceId,
      value: a.value,
      unit: a.unit,
      safeMin: a.safeMin,
      safeMax: a.safeMax,
      severity: a.severity,
      alertId: a.alertId,
      recordedAt: a.recordedAt.toISOString(),
    })),
  });
}
