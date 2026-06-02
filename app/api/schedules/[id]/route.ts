import { Cron } from "croner";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  cron: z.string().min(1).max(120).optional(),
  action: z.string().min(1).max(120).optional(),
  deviceId: z.string().nullable().optional(),
  isEnabled: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "BAD_REQUEST",
        message: parsed.error.issues[0]?.message ?? "Invalid payload",
      },
      { status: 400 },
    );
  }

  const target = await prisma.schedule.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Schedule not found" },
      { status: 404 },
    );
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.description !== undefined)
    data.description = parsed.data.description;
  if (parsed.data.action !== undefined) data.action = parsed.data.action;
  if (parsed.data.deviceId !== undefined) data.deviceId = parsed.data.deviceId;
  if (parsed.data.isEnabled !== undefined)
    data.isEnabled = parsed.data.isEnabled;

  if (parsed.data.cron !== undefined && parsed.data.cron !== target.cron) {
    try {
      const c = new Cron(parsed.data.cron, { paused: true });
      data.cron = parsed.data.cron;
      data.nextRunAt = c.nextRun();
    } catch {
      return NextResponse.json(
        {
          error: "INVALID_CRON",
          message: `Invalid cron expression: "${parsed.data.cron}"`,
        },
        { status: 400 },
      );
    }
  }

  const updated = await prisma.schedule.update({ where: { id }, data });
  return NextResponse.json({
    schedule: {
      id: updated.id,
      deviceId: updated.deviceId,
      name: updated.name,
      description: updated.description,
      cron: updated.cron,
      action: updated.action,
      isEnabled: updated.isEnabled,
      nextRunAt: updated.nextRunAt ? updated.nextRunAt.toISOString() : null,
      lastRunAt: updated.lastRunAt ? updated.lastRunAt.toISOString() : null,
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const target = await prisma.schedule.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Schedule not found" },
      { status: 404 },
    );
  }
  await prisma.schedule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
