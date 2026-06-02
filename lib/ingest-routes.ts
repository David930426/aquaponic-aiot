// Helpers shared by the per-sensor ingest routes.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { verifyApiKey } from "./api-key";
import { ingestReading } from "./ingest";
import { prisma } from "./prisma";

/** Standard JSON body for a single-sensor endpoint. */
export const SingleReadingSchema = z.object({
  /** Optional explicit device id ("dev-003"). When omitted, we route by deviceType + zone. */
  deviceId: z.string().optional(),
  /** The sensor value. */
  value: z.number().finite(),
  /** Optional unit override (e.g. "°C"). */
  unit: z.string().optional(),
  /** Optional ISO timestamp (defaults to now). */
  recordedAt: z.string().datetime().optional(),
  /** Optional zone scope (defaults to zone-001). */
  zoneId: z.string().optional(),
});

export type SingleReading = z.infer<typeof SingleReadingSchema>;

export async function requireApiKey(req: NextRequest) {
  const raw = req.headers.get("x-api-key");
  const key = await verifyApiKey(raw);
  if (!key) {
    return NextResponse.json(
      {
        error: "UNAUTHORIZED",
        message:
          "Missing or invalid X-API-Key header. Create one in Settings → API Keys.",
      },
      { status: 401 },
    );
  }
  return null; // ok
}

/**
 * Resolve which Device should receive this reading: prefer explicit deviceId,
 * otherwise find the first device in the zone matching the given deviceType.
 */
export async function resolveDeviceId(
  deviceType: string,
  body: SingleReading,
): Promise<string | null> {
  if (body.deviceId) return body.deviceId;
  const zoneId = body.zoneId ?? "zone-001";
  const device = await prisma.device.findFirst({
    where: { zoneId, deviceType },
    orderBy: { createdAt: "asc" },
  });
  return device?.id ?? null;
}

export async function handleSingleSensor(
  req: NextRequest,
  deviceType: string,
) {
  const unauthorized = await requireApiKey(req);
  if (unauthorized) return unauthorized;

  const json = await req.json().catch(() => null);
  const parsed = SingleReadingSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "BAD_REQUEST",
        message: parsed.error.issues[0]?.message ?? "Invalid payload",
      },
      { status: 400 },
    );
  }

  const deviceId = await resolveDeviceId(deviceType, parsed.data);
  if (!deviceId) {
    return NextResponse.json(
      {
        error: "DEVICE_NOT_FOUND",
        message: `No ${deviceType} device found in zone ${parsed.data.zoneId ?? "zone-001"}`,
      },
      { status: 404 },
    );
  }

  const result = await ingestReading({
    deviceId,
    value: parsed.data.value,
    unit: parsed.data.unit,
    recordedAt: parsed.data.recordedAt,
  });

  return NextResponse.json({ result });
}
