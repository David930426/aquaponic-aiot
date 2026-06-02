import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  enabled: z.boolean(),
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
  return NextResponse.json(device);
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

  // Block toggling a scheduled feeder via manual switch (matches design.md §7.3)
  if (existing.status === "scheduled" && !parsed.data.enabled) {
    return NextResponse.json(
      {
        error: "DEVICE_LOCKED",
        message: "此設備目前正在排程中，無法手動關閉",
      },
      { status: 422 },
    );
  }

  const nextStatus = parsed.data.enabled
    ? existing.status === "idle"
      ? existing.deviceType === "pump"
        ? "running"
        : existing.deviceType === "aeration"
          ? "running"
          : existing.deviceType === "lighting"
            ? "on"
            : "active"
      : existing.status
    : "idle";

  const updated = await prisma.device.update({
    where: { id },
    data: { isEnabled: parsed.data.enabled, status: nextStatus },
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    isEnabled: updated.isEnabled,
    status: updated.status,
    updatedAt: updated.updatedAt.getTime(),
  });
}
