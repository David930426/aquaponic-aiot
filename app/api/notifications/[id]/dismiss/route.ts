import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const exists = await prisma.notification.findUnique({ where: { id } });
  if (!exists) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Notification not found" },
      { status: 404 },
    );
  }
  await prisma.notification.update({
    where: { id },
    data: { isDismissed: true, isRead: true },
  });
  return NextResponse.json({ ok: true });
}
