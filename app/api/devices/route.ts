import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Device, DevicesResponse, DeviceStatus, DeviceType } from "@/types/api";

export const dynamic = "force-dynamic";

const DEVICE_TYPES = [
  "pump",
  "sensor_temp",
  "sensor_ph",
  "sensor_level",
  "sensor_do",
  "sensor_flow",
  "feeder",
  "lighting",
  "aeration",
] as const;

// Default status + reading label for a freshly created device, by type.
function defaultsForType(deviceType: DeviceType): {
  status: DeviceStatus;
  readingLabel: string | null;
} {
  switch (deviceType) {
    case "sensor_temp":
    case "sensor_ph":
    case "sensor_do":
    case "sensor_flow":
      return { status: "active", readingLabel: "Current reading" };
    case "sensor_level":
      return { status: "active", readingLabel: "Level" };
    case "pump":
    case "aeration":
      return { status: "idle", readingLabel: null };
    case "feeder":
      return { status: "idle", readingLabel: null };
    case "lighting":
      return { status: "idle", readingLabel: null };
    default:
      return { status: "idle", readingLabel: null };
  }
}

const CreateSchema = z.object({
  name: z.string().min(1).max(80),
  deviceType: z.enum(DEVICE_TYPES),
  zoneId: z.string().optional(),
  apiUrl: z.string().url().optional().or(z.literal("")),
  apiToken: z.string().optional(),
  safeMin: z.number().finite().nullable().optional(),
  safeMax: z.number().finite().nullable().optional(),
  readingUnit: z.string().max(12).optional(),
  simBaseline: z.number().finite().nullable().optional(),
  simAmplitude: z.number().finite().nullable().optional(),
  simNoise: z.number().finite().nullable().optional(),
});

/** Map a Prisma device row to the API Device shape (no secrets). */
export function toApiDevice(d: {
  id: string;
  name: string;
  deviceType: string;
  status: string;
  isEnabled: boolean;
  readingLabel: string | null;
  readingValue: string | null;
  readingRaw: number | null;
  readingUnit: string | null;
  apiUrl: string | null;
  apiToken: string | null;
  safeMin: number | null;
  safeMax: number | null;
  simBaseline: number | null;
  simAmplitude: number | null;
  simNoise: number | null;
}): Device {
  return {
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
    apiUrl: d.apiUrl,
    hasApiToken: !!d.apiToken,
    safeMin: d.safeMin,
    safeMax: d.safeMax,
    readingUnit: d.readingUnit,
    simBaseline: d.simBaseline,
    simAmplitude: d.simAmplitude,
    simNoise: d.simNoise,
  };
}

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

  const body: DevicesResponse = {
    zoneId: zone.id,
    zoneName: zone.name,
    devices: zone.devices.map(toApiDevice),
  };

  return NextResponse.json(body);
}

/** Generate the next "dev-NNN" id by scanning existing ones. */
async function nextDeviceId(): Promise<string> {
  const devices = await prisma.device.findMany({ select: { id: true } });
  let max = 0;
  for (const { id } of devices) {
    const m = /^dev-(\d+)$/.exec(id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `dev-${String(max + 1).padStart(3, "0")}`;
}

export async function POST(req: NextRequest) {
  const me = await getSessionUser(req);
  if (!requireAdmin(me)) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Admins only" },
      { status: 403 },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "BAD_REQUEST",
        message: parsed.error.issues[0]?.message ?? "Invalid payload",
      },
      { status: 400 },
    );
  }

  const zoneId = parsed.data.zoneId ?? "zone-001";
  const zone = await prisma.zone.findUnique({ where: { id: zoneId } });
  if (!zone) {
    return NextResponse.json(
      { error: "ZONE_NOT_FOUND", message: "Zone not found" },
      { status: 404 },
    );
  }

  const id = await nextDeviceId();
  const { status, readingLabel } = defaultsForType(parsed.data.deviceType);

  const created = await prisma.device.create({
    data: {
      id,
      zoneId,
      name: parsed.data.name,
      deviceType: parsed.data.deviceType,
      status,
      isEnabled: true,
      readingLabel,
      readingUnit: parsed.data.readingUnit ?? null,
      apiUrl: parsed.data.apiUrl || null,
      apiToken: parsed.data.apiToken || null,
      safeMin: parsed.data.safeMin ?? null,
      safeMax: parsed.data.safeMax ?? null,
      simBaseline: parsed.data.simBaseline ?? null,
      simAmplitude: parsed.data.simAmplitude ?? null,
      simNoise: parsed.data.simNoise ?? null,
    },
  });

  return NextResponse.json({ device: toApiDevice(created) }, { status: 201 });
}
