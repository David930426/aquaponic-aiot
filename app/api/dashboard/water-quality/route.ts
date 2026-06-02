import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SOURCES = [
  { key: "ph", deviceId: "dev-003" },
  { key: "temp", deviceId: "dev-002" },
  { key: "do", deviceId: "dev-008" },
] as const;

export async function GET(req: NextRequest) {
  const days = Math.min(
    30,
    Math.max(1, Number(req.nextUrl.searchParams.get("days") ?? "7")),
  );
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await prisma.sensorReading.findMany({
    where: {
      deviceId: { in: SOURCES.map((s) => s.deviceId) },
      recordedAt: { gte: since },
    },
    orderBy: { recordedAt: "asc" },
  });

  // Bucket by calendar day so the chart shows Mon-Sun
  const buckets = new Map<
    string,
    { day: string; ts: number; ph: number[]; temp: number[]; do: number[] }
  >();

  for (const r of rows) {
    const d = new Date(r.recordedAt);
    const dayKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    let bucket = buckets.get(dayKey);
    if (!bucket) {
      bucket = { day: dayKey, ts: d.getTime(), ph: [], temp: [], do: [] };
      buckets.set(dayKey, bucket);
    }
    const source = SOURCES.find((s) => s.deviceId === r.deviceId);
    if (source) bucket[source.key].push(r.value);
  }

  const mean = (xs: number[]) =>
    xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

  const series = Array.from(buckets.values())
    .sort((a, b) => a.ts - b.ts)
    .map((b) => ({
      ts: b.ts,
      ph: Number(mean(b.ph).toFixed(2)),
      temp: Number(mean(b.temp).toFixed(2)),
      do: Number(mean(b.do).toFixed(2)),
    }));

  return NextResponse.json({ days, series });
}
