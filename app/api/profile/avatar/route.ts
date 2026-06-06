import { NextRequest, NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import {
  StorageNotConfiguredError,
  avatarKey,
  deleteObject,
  isStorageConfigured,
  putObject,
} from "@/lib/storage";

export const dynamic = "force-dynamic";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export async function POST(req: NextRequest) {
  const me = await getSessionUser(req);
  if (!me) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Sign in required" },
      { status: 401 },
    );
  }

  if (!isStorageConfigured()) {
    return NextResponse.json(
      {
        error: "STORAGE_UNCONFIGURED",
        message:
          "Photo uploads are disabled until S3/MinIO is configured (see .env).",
      },
      { status: 503 },
    );
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Missing file" },
      { status: 400 },
    );
  }
  if (!ACCEPTED_TYPES.has(file.type)) {
    return NextResponse.json(
      {
        error: "UNSUPPORTED_TYPE",
        message: "Only JPEG, PNG, or WebP images are accepted",
      },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "TOO_LARGE", message: "Image must be 2 MB or smaller" },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    await putObject(avatarKey(me.id), buffer, file.type);
  } catch (err) {
    if (err instanceof StorageNotConfiguredError) {
      return NextResponse.json(
        { error: "STORAGE_UNCONFIGURED", message: err.message },
        { status: 503 },
      );
    }
    console.error("[avatar] upload failed:", err);
    return NextResponse.json(
      { error: "UPLOAD_FAILED", message: "Could not upload image" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    avatarUrl: `/api/profile/avatar/${me.id}?v=${Date.now()}`,
  });
}

export async function DELETE(req: NextRequest) {
  const me = await getSessionUser(req);
  if (!me) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Sign in required" },
      { status: 401 },
    );
  }
  if (!isStorageConfigured()) {
    // No bucket → nothing to delete; treat as success so the UI flow is clean.
    return NextResponse.json({ ok: true });
  }
  try {
    await deleteObject(avatarKey(me.id));
  } catch (err) {
    console.error("[avatar] delete failed:", err);
    return NextResponse.json(
      { error: "DELETE_FAILED", message: "Could not delete image" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
