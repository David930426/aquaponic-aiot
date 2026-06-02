import { Cron } from "croner";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import type { ScheduleItem } from "@/types/api";

export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  cron: z.string().min(1).max(120),
  action: z.string().min(1).max(120),
  deviceId: z.string().optional().nullable(),
  isEnabled: z.boolean().optional().default(true),
  zoneId: z.string().optional().default("zone-001"),
});

function toResponse(s: {
  id: string;
  deviceId: string | null;
  name: string;
  description: string | null;
  cron: string;
  action: string;
  isEnabled: boolean;
  nextRunAt: Date | null;
  lastRunAt: Date | null;
}): ScheduleItem {
  return {
    id: s.id,
    deviceId: s.deviceId,
    name: s.name,
    description: s.description,
    cron: s.cron,
    action: s.action,
    isEnabled: s.isEnabled,
    nextRunAt: s.nextRunAt ? s.nextRunAt.toISOString() : null,
    lastRunAt: s.lastRunAt ? s.lastRunAt.toISOString() : null,
  };
}

export async function GET(req: NextRequest) {
  const zoneId = req.nextUrl.searchParams.get("zoneId") ?? "zone-001";
  const schedules = await prisma.schedule.findMany({
    where: { zoneId },
    orderBy: { nextRunAt: "asc" },
  });
  return NextResponse.json({
    zoneId,
    schedules: schedules.map(toResponse),
  });
}

export async function POST(req: NextRequest) {
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

  // Validate cron expression
  let nextRunAt: Date | null = null;
  try {
    const c = new Cron(parsed.data.cron, { paused: true });
    nextRunAt = c.nextRun();
  } catch {
    return NextResponse.json(
      {
        error: "INVALID_CRON",
        message: `Invalid cron expression: "${parsed.data.cron}"`,
      },
      { status: 400 },
    );
  }

  const created = await prisma.schedule.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      cron: parsed.data.cron,
      action: parsed.data.action,
      deviceId: parsed.data.deviceId ?? null,
      isEnabled: parsed.data.isEnabled,
      zoneId: parsed.data.zoneId,
      nextRunAt,
    },
  });

  return NextResponse.json({ schedule: toResponse(created) }, { status: 201 });
}
