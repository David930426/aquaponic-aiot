import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// PATCH lets the signed-in user update their own name + (optionally) email.
// Email changes require the current password to confirm the request actually
// came from the account holder.
const PatchSchema = z
  .object({
    name: z.string().min(1).max(80).optional(),
    email: z.string().email().optional(),
    currentPassword: z.string().optional(),
  })
  .refine((v) => v.name !== undefined || v.email !== undefined, {
    message: "Nothing to update",
  });

export async function GET(req: NextRequest) {
  const me = await getSessionUser(req);
  if (!me) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Sign in required" },
      { status: 401 },
    );
  }
  return NextResponse.json({
    user: {
      id: me.id,
      email: me.email,
      name: me.name,
      role: me.role,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const me = await getSessionUser(req);
  if (!me) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Sign in required" },
      { status: 401 },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "BAD_REQUEST",
        message: parsed.error.issues[0]?.message ?? "Invalid payload",
      },
      { status: 400 },
    );
  }
  const { name, email, currentPassword } = parsed.data;

  // Email change requires current-password confirmation — same guardrail a
  // proper user-settings flow uses to prevent session-hijack email swaps.
  if (email && email !== me.email) {
    if (!currentPassword) {
      return NextResponse.json(
        {
          error: "PASSWORD_REQUIRED",
          message: "Current password is required to change email",
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
    const taken = await prisma.user.findUnique({ where: { email } });
    if (taken && taken.id !== me.id) {
      return NextResponse.json(
        { error: "EMAIL_TAKEN", message: "This email is already in use" },
        { status: 409 },
      );
    }
  }

  const updated = await prisma.user.update({
    where: { id: me.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(email !== undefined ? { email } : {}),
    },
    select: { id: true, email: true, name: true, role: true },
  });

  return NextResponse.json({ user: updated });
}
