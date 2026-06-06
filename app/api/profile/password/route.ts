import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser, hashToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(72),
});

export async function POST(req: NextRequest) {
  const me = await getSessionUser(req);
  if (!me) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Sign in required" },
      { status: 401 },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "BAD_REQUEST",
        message: parsed.error.issues[0]?.message ?? "Invalid payload",
      },
      { status: 400 },
    );
  }
  const { currentPassword, newPassword } = parsed.data;

  if (currentPassword === newPassword) {
    return NextResponse.json(
      {
        error: "SAME_PASSWORD",
        message: "New password must differ from current password",
      },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { id: me.id } });
  if (!user) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "User not found" },
      { status: 404 },
    );
  }

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) {
    return NextResponse.json(
      { error: "INVALID_PASSWORD", message: "Current password is incorrect" },
      { status: 401 },
    );
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: me.id },
    data: { passwordHash: newHash },
  });

  // Invalidate every OTHER session so a leaked token can't keep using the
  // account after the owner rotates their password. We keep the current
  // session alive (looked up by its token hash) so the user doesn't get
  // bounced to /login immediately after submitting the form.
  const currentTokenRaw = req.cookies.get("aquawatch_session")?.value;
  const currentHash = currentTokenRaw ? hashToken(currentTokenRaw) : null;
  await prisma.session.deleteMany({
    where: {
      userId: me.id,
      ...(currentHash ? { token: { not: currentHash } } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
