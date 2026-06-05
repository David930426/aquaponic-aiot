import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  const items = await prisma.notification.findMany({
    where: {
      isDismissed: false,
      OR: [{ snoozeUntil: null }, { snoozeUntil: { lte: now } }],
    },
    orderBy: { triggeredAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    notifications: items.map((n) => ({
      id: n.id,
      scheduleId: n.scheduleId,
      title: n.title,
      body: n.body,
      isRead: n.isRead,
      triggeredAt: n.triggeredAt.toISOString(),
    })),
  });
}
