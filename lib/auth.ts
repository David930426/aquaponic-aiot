import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE } from "./auth-constants";
import { prisma } from "./prisma";

export { SESSION_COOKIE };

// Session lifetime knobs. "Remember me" extends the cookie/db expiry; otherwise
// the cookie is a per-browser-session value with a short DB-side expiry so a
// stolen token expires quickly.
const SESSION_DAYS_DEFAULT = Number(process.env.AUTH_SESSION_DAYS ?? "1");
const SESSION_DAYS_REMEMBER = Number(
  process.env.AUTH_SESSION_REMEMBER_DAYS ?? "30",
);

const DEV_SECRET_PLACEHOLDER =
  "dev-secret-change-me-in-production-please-32-bytes-min";

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET is not configured. Set it in .env to a long random string (e.g. `node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"`).",
    );
  }
  if (
    process.env.NODE_ENV === "production" &&
    secret === DEV_SECRET_PLACEHOLDER
  ) {
    throw new Error(
      "AUTH_SECRET is still set to the development placeholder. Rotate it before deploying.",
    );
  }
  return secret;
}

/**
 * Hash a raw session token with HMAC-SHA256(AUTH_SECRET).
 * The DB only ever stores the hash; the raw token lives in the user's cookie.
 * Net effect: leaking the DB does NOT let an attacker impersonate sessions
 * unless they also have AUTH_SECRET.
 */
export function hashToken(rawToken: string): string {
  return createHmac("sha256", getSecret()).update(rawToken).digest("hex");
}

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function sessionExpiry(remember = false): Date {
  const days = remember ? SESSION_DAYS_REMEMBER : SESSION_DAYS_DEFAULT;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

/**
 * Resolve a session to a user. Reads the httpOnly cookie first, then falls
 * back to a Bearer header for non-browser callers (curl, gateways).
 * Returns null when missing/invalid/expired.
 */
export async function getSessionUser(
  req: NextRequest,
): Promise<SessionUser | null> {
  let rawToken: string | null = req.cookies.get(SESSION_COOKIE)?.value ?? null;
  if (!rawToken) {
    const header = req.headers.get("authorization") ?? "";
    if (header.startsWith("Bearer ")) rawToken = header.slice(7).trim() || null;
  }
  if (!rawToken) return null;

  const tokenHash = hashToken(rawToken);
  const session = await prisma.session.findUnique({
    where: { token: tokenHash },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  };
}

export function requireAdmin(user: SessionUser | null): user is SessionUser {
  return user !== null && user.role === "admin";
}

/**
 * Constant-time string compare. Safe against short-circuit timing attacks
 * for tokens or other equal-length secrets. Falls back to false when lengths
 * differ (already a non-secret signal).
 */
export function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/** Attach the session cookie to an outbound response. */
export function setSessionCookie(
  res: NextResponse,
  rawToken: string,
  remember: boolean,
): void {
  const maxAgeSec =
    (remember ? SESSION_DAYS_REMEMBER : SESSION_DAYS_DEFAULT) * 24 * 60 * 60;
  res.cookies.set(SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // No maxAge when not remembering → session cookie that dies with the browser.
    ...(remember ? { maxAge: maxAgeSec } : {}),
  });
}

/** Remove the session cookie from the client. */
export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/** Pull the raw client IP from common proxy headers. Used by rate-limit. */
export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
