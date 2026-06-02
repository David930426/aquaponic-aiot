import { NextRequest, NextResponse } from "next/server";

import { getSessionUser, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await getSessionUser(req);
  if (!requireAdmin(me)) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Admins only" },
      { status: 403 },
    );
  }
  const { id } = await params;
  const existing = await prisma.apiKey.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "API key not found" },
      { status: 404 },
    );
  }
  // Soft-delete via revoke flag — preserves audit trail (last used, label).
  await prisma.apiKey.update({
    where: { id },
    data: { isRevoked: true },
  });
  return NextResponse.json({ ok: true });
}
