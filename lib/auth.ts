import { createHmac, randomBytes } from "crypto";
import type { NextRequest } from "next/server";

import { prisma } from "./prisma";

const SESSION_DAYS = Number(process.env.AUTH_SESSION_DAYS ?? "7");

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
 * The DB only ever stores the hash; the raw token lives in the user's browser.
 * Net effect: leaking the DB does NOT let an attacker impersonate sessions
 * unless they also have AUTH_SECRET.
 */
export function hashToken(rawToken: string): string {
  return createHmac("sha256", getSecret()).update(rawToken).digest("hex");
}

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function sessionExpiry(): Date {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

/** Resolve a Bearer token to a user. Null when missing/invalid/expired. */
export async function getSessionUser(
  req: NextRequest,
): Promise<SessionUser | null> {
  const header = req.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return null;
  const rawToken = header.slice(7).trim();
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
