import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  generateToken,
  getClientIp,
  hashToken,
  sessionExpiry,
  setSessionCookie,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkLoginRate,
  recordLoginFailure,
  resetLoginFailures,
} from "@/lib/rate-limit";
import type { LoginResponse } from "@/types/api";

export const dynamic = "force-dynamic";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(256),
  remember: z.boolean().optional(),
});

// Pre-computed bcrypt of an unreachable password. We compare against this
// when the user lookup misses, so attackers can't infer "valid email" from
// response timing (the bcrypt round-trip dominates per-request latency).
const DUMMY_HASH =
  "$2a$10$CwTycUXWue0Thq9StjUM0uJ8.dC8KZ.WJ9yQU3kqZyR4PfvDPzG5O";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const json = await req.json().catch(() => null);
  const parsed = LoginSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Invalid credentials format" },
      { status: 400 },
    );
  }
  const { email, password, remember = false } = parsed.data;

  const rate = checkLoginRate(ip, email);
  if (!rate.ok) {
    const message =
      rate.reason === "locked_out"
        ? "Too many failed attempts. Try again later."
        : "Too many requests. Slow down and try again.";
    return NextResponse.json(
      { error: "RATE_LIMITED", message, retryAfterSec: rate.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Always run bcrypt — even on user-miss — to keep timing constant.
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !ok) {
    recordLoginFailure(ip, email);
    return NextResponse.json(
      { error: "INVALID_CREDENTIALS", message: "Incorrect email or password" },
      { status: 401 },
    );
  }

  resetLoginFailures(ip, email);

  const rawToken = generateToken();
  await prisma.session.create({
    data: {
      token: hashToken(rawToken),
      userId: user.id,
      expiresAt: sessionExpiry(remember),
    },
  });

  const body: LoginResponse = {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
  const res = NextResponse.json(body);
  setSessionCookie(res, rawToken, remember);
  return res;
}
