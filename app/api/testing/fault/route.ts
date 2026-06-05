import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { ingestReading } from "@/lib/ingest";
import { prisma } from "@/lib/prisma";
import {
  getThresholdSettings,
  isSensorMetric,
  type SensorMetric,
} from "@/lib/thresholds";

export const dynamic = "force-dynamic";

// Fault modes exposed by the data-testing sandbox so operators can rehearse
// the alerting + dashboard behaviour without waiting for a real hardware
// failure.
//
//   offline     — set status="offline"; simulate a disconnected sensor
//   restore     — clear offline; status returns to its sensor-type default
//   stuck       — re-ingest the device's last reading (a "frozen" sensor)
//   spike_high  — inject a value far above the safe max (critical overshoot)
//   spike_low   — inject a value far below the safe min (critical undershoot)
const BodySchema = z.object({
  deviceId: z.string().min(1),
  mode: z.enum(["offline", "restore", "stuck", "spike_high", "spike_low"]),
});

type Mode = z.infer<typeof BodySchema>["mode"];

const SENSOR_STATUS_AFTER_RESTORE = "active";

export async function POST(req: NextRequest) {
  const me = await getSessionUser(req);
  if (!me) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Sign in required" },
      { status: 401 },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "BAD_REQUEST",
        message: parsed.error.issues[0]?.message ?? "Invalid payload",
      },
      { status: 400 },
    );
  }

  const { deviceId, mode } = parsed.data;
  const device = await prisma.device.findUnique({ where: { id: deviceId } });
  if (!device) {
    return NextResponse.json(
      { error: "DEVICE_NOT_FOUND", message: "Device not found" },
      { status: 404 },
    );
  }

  switch (mode) {
    case "offline":
      return applyOffline(device);
    case "restore":
      return applyRestore(device);
    case "stuck":
      return applyStuck(device);
    case "spike_high":
    case "spike_low":
      return applySpike(device, mode);
  }
}

async function applyOffline(device: { id: string; name: string }) {
  // Flip the device row offline AND record an info-level alert so it shows
  // up in /alerts and the dashboard's recent-alerts widget — the same UX
  // path a real "lost connection" event would trigger.
  const updated = await prisma.device.update({
    where: { id: device.id },
    data: { status: "offline" },
  });
  const alert = await prisma.alert.create({
    data: {
      zoneId: updated.zoneId,
      deviceId: updated.id,
      deviceName: updated.name,
      severity: "critical",
      message: `${updated.name} went offline (fault injection)`,
      isRead: false,
      isResolved: false,
    },
  });
  return NextResponse.json({
    mode: "offline" satisfies Mode,
    device: { id: updated.id, status: updated.status },
    alertId: alert.id,
  });
}

async function applyRestore(device: { id: string }) {
  const updated = await prisma.device.update({
    where: { id: device.id },
    data: { status: SENSOR_STATUS_AFTER_RESTORE, isEnabled: true },
  });
  // Mark unresolved alerts for this device as resolved — restoring closes the
  // book on whatever fault we were simulating.
  await prisma.alert.updateMany({
    where: { deviceId: updated.id, isResolved: false },
    data: { isResolved: true },
  });
  return NextResponse.json({
    mode: "restore" satisfies Mode,
    device: { id: updated.id, status: updated.status },
  });
}

async function applyStuck(device: {
  id: string;
  readingRaw: number | null;
  readingUnit: string | null;
}) {
  // "Stuck" = sensor frozen on its last reading. If we never had a reading
  // (e.g. a non-sensor device), fall back to 0 so we still emit something.
  const value = device.readingRaw ?? 0;
  const result = await ingestReading({
    deviceId: device.id,
    value,
    unit: device.readingUnit ?? undefined,
  });
  return NextResponse.json({ mode: "stuck" satisfies Mode, result });
}

async function applySpike(
  device: {
    id: string;
    deviceType: string;
    readingUnit: string | null;
    safeMin: number | null;
    safeMax: number | null;
  },
  mode: "spike_high" | "spike_low",
) {
  // Resolve a usable safe range: device override → global metric default.
  // We need real numbers to compute "far past" the boundary.
  let safeMin = device.safeMin;
  let safeMax = device.safeMax;
  if (
    (safeMin == null || safeMax == null) &&
    isSensorMetric(device.deviceType)
  ) {
    const thresholds = await getThresholdSettings();
    const fallback = thresholds.defaults[device.deviceType as SensorMetric];
    safeMin = safeMin ?? fallback.min;
    safeMax = safeMax ?? fallback.max;
  }
  if (safeMin == null || safeMax == null) {
    return NextResponse.json(
      {
        error: "NO_RANGE",
        message:
          "Spike fault requires a configured safe range for the device.",
      },
      { status: 400 },
    );
  }
  const span = safeMax - safeMin;
  // Push 50% of the span past the limit so the breach is clearly critical
  // (deltaPercent default is 10%, so 50% lands solidly in critical territory).
  const value = mode === "spike_high" ? safeMax + span * 0.5 : safeMin - span * 0.5;
  const result = await ingestReading({
    deviceId: device.id,
    value,
    unit: device.readingUnit ?? undefined,
  });
  return NextResponse.json({ mode, value, result });
}
