import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface RecommendContext {
  deviceName?: string;
  sensorType?: string;
  severity?: string;
  currentValue?: number;
  safeMax?: number;
  safeMin?: number;
  unit?: string;
  trend?: string;
  locale?: string;
}

function buildScript(ctx: RecommendContext): string[] {
  const name = ctx.deviceName ?? (ctx.locale === "en" ? "device" : "設備");
  const cur = ctx.currentValue ?? "?";
  const max = ctx.safeMax ?? "?";
  const unit = ctx.unit ?? "";
  const isEn = ctx.locale === "en";

  if (isEn) {
    return [
      `**${name} — Anomaly Response**\n\n`,
      `Current reading ${cur}${unit} is outside the safe range (max ${max}${unit}). Suggested steps:\n\n`,
      `1. Verify the related control hardware (circulation pump, heater/chiller) is operating normally\n`,
      `2. Inspect the sensor probe for fouling or air bubbles; clean if needed\n`,
      `3. For temperature anomalies, deploy the shade cloth and add fresh water; for pH anomalies, adjust the buffer dosing\n`,
      `4. Observe fish behavior (surface gasping, refusing food) and plant leaf color closely\n`,
      `5. If conditions don't recover within 30 minutes, contact technical support and switch to backup mode\n`,
    ];
  }

  return [
    `**${name} 異常處理建議**\n\n`,
    `目前讀數 ${cur}${unit} 已超過安全範圍 (上限 ${max}${unit})。建議步驟：\n\n`,
    `1. 立即確認相關控制設備（如循環泵、加熱/降溫器）是否正常運作\n`,
    `2. 檢查感測器探頭是否有積污或氣泡，必要時進行清潔\n`,
    `3. 若為溫度異常，拉上遮陽網並補充新鮮水源；若為 pH 異常，調整 pH 緩衝液用量\n`,
    `4. 密切觀察魚群行為（浮頭、停食）和植物葉色變化\n`,
    `5. 若 30 分鐘內未恢復，建議聯繫技術支援並切換至備援模式\n`,
  ];
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => ({}));
  const ctx: RecommendContext = json?.context ?? {};
  const script = buildScript(ctx);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      send({ type: "start" });

      const started = Date.now();
      for (const chunk of script) {
        const tokens = chunk.match(/.{1,4}/g) ?? [chunk];
        for (const tok of tokens) {
          send({ type: "chunk", content: tok });
          await new Promise((r) => setTimeout(r, 35));
        }
      }

      send({ type: "done", durationMs: Date.now() - started });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
