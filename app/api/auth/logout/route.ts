import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE, clearSessionCookie, hashToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let rawToken: string | null = req.cookies.get(SESSION_COOKIE)?.value ?? null;
  if (!rawToken) {
    const header = req.headers.get("authorization") ?? "";
    if (header.startsWith("Bearer ")) rawToken = header.slice(7).trim() || null;
  }
  if (rawToken) {
    await prisma.session
      .delete({ where: { token: hashToken(rawToken) } })
      .catch(() => {}); // tolerate already-gone sessions
  }

  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
