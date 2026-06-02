import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { broadcastPush } from "@/lib/push";

export const dynamic = "force-dynamic";

/**
 * Manual trigger. Useful for testing that schedules → notifications →
 * push notifications all wire together without waiting for the cron tick.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const s = await prisma.schedule.findUnique({ where: { id } });
  if (!s) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Schedule not found" },
      { status: 404 },
    );
  }

  const notif = await prisma.notification.create({
    data: {
      scheduleId: s.id,
      title: s.name,
      body: s.description ?? `Schedule "${s.name}" triggered (${s.action})`,
    },
  });

  await prisma.schedule.update({
    where: { id: s.id },
    data: { lastRunAt: new Date() },
  });

  const { sent, pruned } = await broadcastPush({
    title: s.name,
    body: notif.body,
    url: "/alerts",
    tag: `schedule-${s.id}`,
    notificationId: notif.id,
  }).catch(() => ({ sent: 0, pruned: 0 }));

  return NextResponse.json({
    notification: { id: notif.id },
    push: { sent, pruned },
  });
}
