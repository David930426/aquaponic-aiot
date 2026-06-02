import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const zoneId = req.nextUrl.searchParams.get("zoneId") ?? "zone-001";
  await prisma.alert.updateMany({
    where: { zoneId, isRead: false },
    data: { isRead: true },
  });
  return NextResponse.json({ ok: true });
}
