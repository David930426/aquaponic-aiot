import { NextRequest } from "next/server";

import { handleSingleSensor } from "@/lib/ingest-routes";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return handleSingleSensor(req, "sensor_level");
}
