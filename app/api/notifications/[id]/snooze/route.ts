import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const Schema = z.object({
  minutes: z.number().int().min(1).max(24 * 60),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "minutes must be 1..1440" },
      { status: 400 },
    );
  }

  const exists = await prisma.notification.findUnique({ where: { id } });
  if (!exists) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Notification not found" },
      { status: 404 },
    );
  }

  const snoozeUntil = new Date(Date.now() + parsed.data.minutes * 60_000);
  await prisma.notification.update({
    where: { id },
    data: { snoozeUntil, isRead: true },
  });
  return NextResponse.json({ ok: true, snoozeUntil: snoozeUntil.toISOString() });
}
