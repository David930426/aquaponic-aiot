import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser, hashToken, requireAdmin } from "@/lib/auth";
import { generateApiKey } from "@/lib/api-key";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  label: z.string().min(1).max(80),
});

export async function GET(req: NextRequest) {
  const me = await getSessionUser(req);
  if (!requireAdmin(me)) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Admins only" },
      { status: 403 },
    );
  }
  const keys = await prisma.apiKey.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      label: true,
      keyPrefix: true,
      isRevoked: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ keys });
}

export async function POST(req: NextRequest) {
  const me = await getSessionUser(req);
  if (!requireAdmin(me)) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Admins only" },
      { status: 403 },
    );
  }
  const json = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Label is required" },
      { status: 400 },
    );
  }

  const { raw, prefix } = generateApiKey();
  const created = await prisma.apiKey.create({
    data: {
      label: parsed.data.label,
      keyPrefix: prefix,
      keyHash: hashToken(raw),
    },
    select: { id: true, label: true, keyPrefix: true, createdAt: true },
  });

  // The raw key is ONLY returned once, on create — never again.
  return NextResponse.json({ key: created, rawKey: raw }, { status: 201 });
}
