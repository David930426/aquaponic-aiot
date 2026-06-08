import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toApiDevice } from "../route";

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

// A PATCH can either be a simple on/off toggle (any signed-in operator) or a
// full config edit (admins only). We detect "edit" by the presence of any
// field other than `enabled`.
const PatchSchema = z.object({
  enabled: z.boolean().optional(),
  name: z.string().min(1).max(80).optional(),
  deviceType: z.enum(DEVICE_TYPES).optional(),
  apiUrl: z.string().url().nullable().optional().or(z.literal("")),
  apiToken: z.string().nullable().optional(),
  safeMin: z.number().finite().nullable().optional(),
  safeMax: z.number().finite().nullable().optional(),
  readingUnit: z.string().max(12).nullable().optional(),
  simBaseline: z.number().finite().nullable().optional(),
  simAmplitude: z.number().finite().nullable().optional(),
  simNoise: z.number().finite().nullable().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const device = await prisma.device.findUnique({ where: { id } });
  if (!device) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Device not found" },
      { status: 404 },
    );
  }
  return NextResponse.json({ device: toApiDevice(device) });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Invalid body" },
      { status: 400 },
    );
  }

  const existing = await prisma.device.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Device not found" },
      { status: 404 },
    );
  }

  const { enabled, ...edits } = parsed.data;
  const isEdit = Object.keys(edits).length > 0;

  // Config edits are admin-only; plain toggles are allowed for any session.
  if (isEdit) {
    const me = await getSessionUser(req);
    if (!requireAdmin(me)) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Admins only" },
        { status: 403 },
      );
    }
  }

  // Block toggling a scheduled feeder off via manual switch (design.md §7.3)
  if (
    enabled === false &&
    existing.status === "scheduled" &&
    !isEdit
  ) {
    return NextResponse.json(
      {
        error: "DEVICE_LOCKED",
        message: "此設備目前正在排程中，無法手動關閉",
      },
      { status: 422 },
    );
  }

  const data: Record<string, unknown> = {};

  if (enabled !== undefined) {
    data.isEnabled = enabled;
    data.status = enabled
      ? existing.status === "idle"
        ? existing.deviceType === "pump" || existing.deviceType === "aeration"
          ? "running"
          : existing.deviceType === "lighting"
            ? "on"
            : "active"
        : existing.status
      : "idle";
  }

  if (edits.name !== undefined) data.name = edits.name;
  if (edits.deviceType !== undefined) data.deviceType = edits.deviceType;
  if (edits.apiUrl !== undefined) data.apiUrl = edits.apiUrl || null;
  if (edits.readingUnit !== undefined) data.readingUnit = edits.readingUnit;
  if (edits.safeMin !== undefined) data.safeMin = edits.safeMin;
  if (edits.safeMax !== undefined) data.safeMax = edits.safeMax;
  if (edits.simBaseline !== undefined) data.simBaseline = edits.simBaseline;
  if (edits.simAmplitude !== undefined) data.simAmplitude = edits.simAmplitude;
  if (edits.simNoise !== undefined) data.simNoise = edits.simNoise;
  // Only overwrite the token when a non-empty value is sent; "" clears it,
  // undefined leaves it untouched.
  if (edits.apiToken !== undefined) data.apiToken = edits.apiToken || null;

  const updated = await prisma.device.update({ where: { id }, data });
  return NextResponse.json({ device: toApiDevice(updated) });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await getSessionUser(req);
  if (!requireAdmin(me)) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Admins only" },
      { status: 403 },
    );
  }

  const { id } = await params;
  const existing = await prisma.device.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Device not found" },
      { status: 404 },
    );
  }

  // Clean up dependent rows (MongoDB has no cascading deletes).
  await prisma.sensorReading.deleteMany({ where: { deviceId: id } });
  await prisma.sensorAnomaly.deleteMany({ where: { deviceId: id } });
  await prisma.alert.deleteMany({ where: { deviceId: id } });
  await prisma.device.delete({ where: { id } });

  return NextResponse.json({ ok: true, id });
}
