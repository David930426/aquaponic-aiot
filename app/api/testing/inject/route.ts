import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { ingestReading } from "@/lib/ingest";

export const dynamic = "force-dynamic";

// Authenticated, session-based ingest used only by the in-app data-testing
// sandbox. Public IoT gateways should still POST to /api/ingest/* with an
// X-API-Key header instead.
const BodySchema = z.object({
  deviceId: z.string().min(1),
  value: z.number().finite(),
  unit: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const me = await getSessionUser(req);
  if (!me) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Sign in required" },
      { status: 401 },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "BAD_REQUEST",
        message: parsed.error.issues[0]?.message ?? "Invalid payload",
      },
      { status: 400 },
    );
  }

  const result = await ingestReading(parsed.data);
  if (result.error === "DEVICE_NOT_FOUND") {
    return NextResponse.json(
      { error: "DEVICE_NOT_FOUND", message: "Device not found" },
      { status: 404 },
    );
  }
  if (result.error === "INVALID_VALUE") {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Invalid value" },
      { status: 400 },
    );
  }

  return NextResponse.json({ result });
}
