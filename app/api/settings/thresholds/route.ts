import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser, requireAdmin } from "@/lib/auth";
import {
  getThresholdSettings,
  updateThresholdSettings,
} from "@/lib/thresholds";

export const dynamic = "force-dynamic";

const MetricSchema = z.object({
  min: z.number().finite(),
  max: z.number().finite(),
});

const PatchSchema = z.object({
  defaults: z
    .object({
      sensor_temp: MetricSchema.optional(),
      sensor_ph: MetricSchema.optional(),
      sensor_level: MetricSchema.optional(),
      sensor_do: MetricSchema.optional(),
    })
    .optional(),
  criticalDeltaPercent: z.number().min(0).max(100).optional(),
});

export async function GET() {
  const settings = await getThresholdSettings();
  return NextResponse.json({ thresholds: settings });
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

  for (const [metric, range] of Object.entries(parsed.data.defaults ?? {})) {
    if (range && range.min >= range.max) {
      return NextResponse.json(
        {
          error: "BAD_REQUEST",
          message: `Min must be less than max for ${metric}`,
        },
        { status: 400 },
      );
    }
  }

  const next = await updateThresholdSettings(parsed.data);
  return NextResponse.json({ thresholds: next });
}
