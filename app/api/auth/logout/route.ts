import { NextRequest, NextResponse } from "next/server";

import { hashToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Bearer ")) {
    const rawToken = header.slice(7).trim();
    if (rawToken) {
      await prisma.session
        .delete({ where: { token: hashToken(rawToken) } })
        .catch(() => {}); // tolerate already-gone sessions
    }
  }
  return NextResponse.json({ ok: true });
}