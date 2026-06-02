import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import type { AlertItem } from "@/types/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const zoneId = req.nextUrl.searchParams.get("zoneId") ?? "zone-001";

  const alerts = await prisma.alert.findMany({
    where: { zoneId, isResolved: false },
    orderBy: { triggeredAt: "desc" },
  });

  const items: AlertItem[] = alerts.map((a) => ({
    id: a.id,
    deviceId: a.deviceId,
    deviceName: a.deviceName,
    severity: a.severity as "warning" | "critical",
    message: a.message,
    triggeredAt: a.triggeredAt.toISOString(),
    isRead: a.isRead,
  }));

  return NextResponse.json({ zoneId, alerts: items });
}
