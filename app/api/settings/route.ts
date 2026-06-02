import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser, requireAdmin } from "@/lib/auth";
import { getSettings, updateSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  dataSource: z.enum(["simulator", "external", "passive"]).optional(),
  externalApiUrl: z.string().optional(),
  externalApiToken: z.string().optional(),
  simulatorIntervalSec: z.number().int().min(1).max(3600).optional(),
  chartRefreshSec: z.number().int().min(5).max(3600).optional(),
  sensorRetentionDays: z.number().int().min(1).max(365).optional(),
});

// Public GET — clients need chartRefreshSec etc. Sensitive bits stripped below.
export async function GET() {
  const s = await getSettings();
  // Hide externalApiToken on read; admins can verify via PATCH if needed.
  return NextResponse.json({
    settings: { ...s, externalApiToken: s.externalApiToken ? "********" : "" },
  });
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
  return NextResponse.json({
    settings: {
      ...next,
      externalApiToken: next.externalApiToken ? "********" : "",
    },
  });
}
