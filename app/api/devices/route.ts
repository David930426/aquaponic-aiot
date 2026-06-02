import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import type { Device, DevicesResponse, DeviceStatus, DeviceType } from "@/types/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const zoneId = req.nextUrl.searchParams.get("zoneId") ?? "zone-001";

  const zone = await prisma.zone.findUnique({
    where: { id: zoneId },
    include: { devices: { orderBy: { createdAt: "asc" } } },
  });

  if (!zone) {
    return NextResponse.json(
      { error: "ZONE_NOT_FOUND", message: "Zone not found" },
      { status: 404 },
    );
  }

  const devices: Device[] = zone.devices.map((d) => ({
    id: d.id,
    name: d.name,
    deviceType: d.deviceType as DeviceType,
    status: d.status as DeviceStatus,
    isEnabled: d.isEnabled,
    reading: d.readingLabel
      ? {
          label: d.readingLabel,
          value: d.readingValue ?? "",
          raw: d.readingRaw,
          unit: d.readingUnit ?? "",
        }
      : null,
  }));

  const body: DevicesResponse = {
    zoneId: zone.id,
    zoneName: zone.name,
    devices,
  };

  return NextResponse.json(body);
}
