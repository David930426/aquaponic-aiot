import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const alert = await prisma.alert.findUnique({ where: { id } });
  if (!alert) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Alert not found" },
      { status: 404 },
    );
  }
  const updated = await prisma.alert.update({
    where: { id },
    data: { isRead: true },
  });
  return NextResponse.json({ id: updated.id, isRead: updated.isRead });
}
