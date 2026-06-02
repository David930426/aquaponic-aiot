import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { generateToken, hashToken, sessionExpiry } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { LoginResponse } from "@/types/api";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = LoginSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Invalid credentials format" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (!user) {
    return NextResponse.json(
      { error: "INVALID_CREDENTIALS", message: "Incorrect email or password" },
      { status: 401 },
    );
  }

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) {
    return NextResponse.json(
      { error: "INVALID_CREDENTIALS", message: "Incorrect email or password" },
      { status: 401 },
    );
  }

  const rawToken = generateToken();
  await prisma.session.create({
    data: {
      token: hashToken(rawToken),
      userId: user.id,
      expiresAt: sessionExpiry(),
    },
  });

  const body: LoginResponse = {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    accessToken: rawToken,
  };
  return NextResponse.json(body);
}
