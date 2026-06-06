import { NextRequest } from "next/server";

import {
  avatarKey,
  getObjectStream,
  isStorageConfigured,
} from "@/lib/storage";

export const dynamic = "force-dynamic";

// Public proxy: streams the avatar back so the bucket can stay private and
// every dashboard page can show "/api/profile/avatar/<userId>" without
// caring whether the storage layer is MinIO, R2, or S3. Returns 404 when
// the user hasn't uploaded an avatar — Radix Avatar then falls back to
// initials in <AvatarFallback>.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  if (!isStorageConfigured()) {
    return new Response(null, { status: 404 });
  }
  const obj = await getObjectStream(avatarKey(userId));
  if (!obj) return new Response(null, { status: 404 });

  return new Response(obj.body, {
    headers: {
      "Content-Type": obj.contentType,
      // Browser may cache for a minute; the upload response returns a URL
      // with ?v=<timestamp> so a fresh upload bypasses the cache.
      "Cache-Control": "public, max-age=60",
      ...(obj.contentLength
        ? { "Content-Length": String(obj.contentLength) }
        : {}),
    },
  });
}
