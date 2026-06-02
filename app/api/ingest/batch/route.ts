import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireApiKey } from "@/lib/ingest-routes";
import { ingestReading, type IngestResult } from "@/lib/ingest";

export const dynamic = "force-dynamic";

const BatchSchema = z.object({
  readings: z
    .array(
      z.object({
        deviceId: z.string().min(1),
        value: z.number().finite(),
        unit: z.string().optional(),
        recordedAt: z.string().datetime().optional(),
      }),
    )
    .min(1)
    .max(500),
});

export async function POST(req: NextRequest) {
  const unauthorized = await requireApiKey(req);
  if (unauthorized) return unauthorized;

  const json = await req.json().catch(() => null);
  const parsed = BatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "BAD_REQUEST",
        message: parsed.error.issues[0]?.message ?? "Invalid payload",
      },
      { status: 400 },
    );
  }

  const results: IngestResult[] = [];
  for (const r of parsed.data.readings) {
    results.push(await ingestReading(r));
  }

  const stored = results.filter((r) => r.stored).length;
  const anomalies = results.filter((r) => r.isAnomaly).length;
  return NextResponse.json({ stored, anomalies, results });
}
