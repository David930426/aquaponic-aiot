import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser, requireAdmin } from "@/lib/auth";
import { getSettings, updateSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  dataSource: z.enum(["passive", "live"]).optional(),
  pollIntervalSec: z.number().int().min(5).max(3600).optional(),
  chartRefreshSec: z.number().int().min(5).max(3600).optional(),
  sensorRetentionDays: z.number().int().min(1).max(365).optional(),
});

// Public GET — clients need chartRefreshSec etc.
export async function GET() {
  const s = await getSettings();
  return NextResponse.json({ settings: s });
}

export async function PATCH(req: NextRequest) {
  const me = await getSessionUser(req);
  if (!requireAdmin(me)) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Admins only" },
      { status: 403 },
    );
  }
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
  const next = await updateSettings(parsed.data);
  return NextResponse.json({ settings: next });
}
