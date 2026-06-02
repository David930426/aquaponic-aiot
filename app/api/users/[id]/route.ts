import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  email: z.string().email().optional(),
  role: z.enum(["operator", "admin"]).optional(),
  // Empty string = "don't change password"; otherwise must be valid length.
  password: z
    .union([z.string().length(0), z.string().min(8).max(72)])
    .optional(),
});

// Demoting or deleting the last admin would lock everyone out of /settings/users.
async function wouldRemoveLastAdmin(
  userId: string,
  newRole: string | null, // null = deletion
): Promise<boolean> {
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.role !== "admin") return false;
  if (newRole === "admin") return false;

  const otherAdmins = await prisma.user.count({
    where: { role: "admin", id: { not: userId } },
  });
  return otherAdmins === 0;
}

export async function PATCH(
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

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "User not found" },
      { status: 404 },
    );
  }

  // Block demoting the only admin
  if (
    parsed.data.role &&
    parsed.data.role !== target.role &&
    (await wouldRemoveLastAdmin(id, parsed.data.role))
  ) {
    return NextResponse.json(
      {
        error: "LAST_ADMIN",
        message: "Cannot demote the only remaining admin",
      },
      { status: 422 },
    );
  }

  // Block changing email to one that's already taken (by someone else)
  if (parsed.data.email && parsed.data.email !== target.email) {
    const collision = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });
    if (collision && collision.id !== id) {
      return NextResponse.json(
        { error: "EMAIL_TAKEN", message: "This email is already in use" },
        { status: 409 },
      );
    }
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.email !== undefined) data.email = parsed.data.email;
  if (parsed.data.role !== undefined) data.role = parsed.data.role;
  if (parsed.data.password) {
    data.passwordHash = await bcrypt.hash(parsed.data.password, 10);
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });

  // If we changed the password, kill all the user's active sessions so old
  // tokens stop working (forces re-login on other devices).
  if (parsed.data.password) {
    await prisma.session.deleteMany({ where: { userId: id } });
  }

  return NextResponse.json({ user: updated });
}

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

  if (id === me.id) {
    return NextResponse.json(
      { error: "SELF_DELETE", message: "You cannot delete your own account" },
      { status: 422 },
    );
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "User not found" },
      { status: 404 },
    );
  }

  if (await wouldRemoveLastAdmin(id, null)) {
    return NextResponse.json(
      {
        error: "LAST_ADMIN",
        message: "Cannot delete the only remaining admin",
      },
      { status: 422 },
    );
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
