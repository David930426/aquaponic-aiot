import { randomBytes } from "crypto";

import { hashToken } from "./auth";
import { prisma } from "./prisma";

const PREFIX = "aqua_";

export function generateApiKey(): { raw: string; prefix: string } {
  const rand = randomBytes(24).toString("base64url");
  const raw = `${PREFIX}${rand}`;
  // First 8 chars after the prefix is what we display in the UI.
  const prefix = raw.slice(0, PREFIX.length + 8);
  return { raw, prefix };
}

/**
 * Verify a raw key from the X-API-Key header. Returns the ApiKey row when
 * valid, or null. Also bumps lastUsedAt — best effort, ignored on failure.
 */
export async function verifyApiKey(rawKey: string | null) {
  if (!rawKey) return null;
  if (!rawKey.startsWith(PREFIX)) return null;
  const key = await prisma.apiKey.findUnique({
    where: { keyHash: hashToken(rawKey) },
  });
  if (!key || key.isRevoked) return null;
  prisma.apiKey
    .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});
  return key;
}
