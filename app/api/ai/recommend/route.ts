import { NextRequest } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getThresholdSettings, isSensorMetric } from "@/lib/thresholds";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  alertId: z.string().min(1),
  locale: z.enum(["en", "zh-TW"]).optional(),
});

type Locale = "en" | "zh-TW";

interface AnalysisContext {
  deviceName: string;
  deviceType: string;
  metricLabel: string;
  unit: string;
  currentValue: number | null;
  safeMin: number | null;
  safeMax: number | null;
  severity: "warning" | "critical" | "info";
  direction: "above" | "below" | "unknown";
  locale: Locale;
  alertMessage: string;
}

const METRIC_LABEL: Record<string, { en: string; "zh-TW": string }> = {
  sensor_temp: { en: "water temperature", "zh-TW": "水溫" },
  sensor_ph: { en: "pH", "zh-TW": "pH 值" },
  sensor_level: { en: "water level", "zh-TW": "水位" },
  sensor_do: { en: "dissolved oxygen", "zh-TW": "溶氧量" },
};

export async function POST(req: NextRequest) {
  const me = await getSessionUser(req);
  if (!me) {
    return new Response(
      JSON.stringify({ error: "UNAUTHORIZED", message: "Sign in required" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "BAD_REQUEST", message: "Invalid payload" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { alertId, locale = "en" } = parsed.data;

  const alert = await prisma.alert.findUnique({ where: { id: alertId } });
  if (!alert) {
    return new Response(
      JSON.stringify({ error: "NOT_FOUND", message: "Alert not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  }

  const device = await prisma.device.findUnique({
    where: { id: alert.deviceId },
  });
  const thresholds = await getThresholdSettings();

  let safeMin = device?.safeMin ?? null;
  let safeMax = device?.safeMax ?? null;
  if (device && isSensorMetric(device.deviceType)) {
    const fallback = thresholds.defaults[device.deviceType];
    safeMin = safeMin ?? fallback.min;
    safeMax = safeMax ?? fallback.max;
  }

  const current = device?.readingRaw ?? null;
  const direction: AnalysisContext["direction"] =
    current == null || safeMax == null || safeMin == null
      ? "unknown"
      : current > safeMax
        ? "above"
        : current < safeMin
          ? "below"
          : "unknown";

  const metricLabel =
    device && METRIC_LABEL[device.deviceType]
      ? METRIC_LABEL[device.deviceType][locale]
      : alert.deviceName;

  const ctx: AnalysisContext = {
    deviceName: alert.deviceName,
    deviceType: device?.deviceType ?? "",
    metricLabel,
    unit: device?.readingUnit ?? "",
    currentValue: typeof current === "number" ? current : null,
    safeMin,
    safeMax,
    severity: alert.severity as AnalysisContext["severity"],
    direction,
    locale,
    alertMessage: alert.message,
  };

  // Prefer a real LLM when ANTHROPIC_API_KEY is configured. Otherwise fall
  // back to a context-aware deterministic script so the feature still works
  // for self-hosted / offline deployments.
  const stream = process.env.ANTHROPIC_API_KEY
    ? await streamFromAnthropic(ctx)
    : streamDeterministic(ctx);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

// ─── Deterministic fallback ────────────────────────────────────────────────

function buildDeterministicScript(ctx: AnalysisContext): string {
  const isEn = ctx.locale === "en";
  const v =
    ctx.currentValue == null ? "?" : ctx.currentValue.toFixed(2).replace(/\.00$/, "");
  const range =
    ctx.safeMin != null && ctx.safeMax != null
      ? `${ctx.safeMin}${ctx.unit}–${ctx.safeMax}${ctx.unit}`
      : isEn
        ? "configured safe range"
        : "設定的安全範圍";
  const breachWord = isEn
    ? ctx.direction === "above"
      ? "above"
      : ctx.direction === "below"
        ? "below"
        : "outside"
    : ctx.direction === "above"
      ? "高於"
      : ctx.direction === "below"
        ? "低於"
        : "超出";

  const steps = remediationSteps(ctx);
  const severityHeader = headerFor(ctx);

  // Double newlines between sections so the client renderer treats each
  // chunk as its own paragraph / heading block. Single newlines inside the
  // numbered list keep adjacent steps tight.
  if (isEn) {
    return [
      `### ${severityHeader}`,
      ``,
      `**${ctx.deviceName}** is reporting **${ctx.metricLabel} = ${v}${ctx.unit}**, which is ${breachWord} the safe range (${range}).`,
      ``,
      `**Recommended actions:**`,
      ``,
      ...steps.map((s, i) => `${i + 1}. ${s}`),
      ``,
      `_If conditions don't normalize within 30 minutes, escalate to on-call and switch the zone to backup mode._`,
      ``,
    ].join("\n");
  }

  return [
    `### ${severityHeader}`,
    ``,
    `**${ctx.deviceName}** 目前 **${ctx.metricLabel} = ${v}${ctx.unit}**，已 ${breachWord} 安全範圍（${range}）。`,
    ``,
    `**建議處理步驟：**`,
    ``,
    ...steps.map((s, i) => `${i + 1}. ${s}`),
    ``,
    `_若 30 分鐘內讀數未恢復，請通知值班並切換至備援模式。_`,
    ``,
  ].join("\n");
}

function headerFor(ctx: AnalysisContext): string {
  const isEn = ctx.locale === "en";
  if (ctx.severity === "critical") {
    return isEn ? "Critical anomaly response" : "嚴重異常處理建議";
  }
  if (ctx.severity === "warning") {
    return isEn ? "Warning — investigate soon" : "警告 — 建議儘速排查";
  }
  return isEn ? "Notice" : "提醒";
}

function remediationSteps(ctx: AnalysisContext): string[] {
  const isEn = ctx.locale === "en";
  const dir = ctx.direction;

  // Sensor-type aware. Falls through to a generic checklist for unknown types.
  if (ctx.deviceType === "sensor_temp") {
    return isEn
      ? [
          dir === "above"
            ? "Deploy shade cloth and turn on the chiller / circulation pump to draw heat out of the tank."
            : "Activate the inline heater and reduce fresh-water inflow until temperature recovers.",
          "Cross-check with a hand-held thermometer to rule out a fouled probe.",
          "Inspect the circulation pump impeller and pipework for blockages.",
          "Observe fish behaviour (surface gasping, listlessness) and reduce feeding if stressed.",
          "Log the incident with a current photo of the probe and tank.",
        ]
      : [
          dir === "above"
            ? "拉上遮陽網並啟動降溫器 / 循環泵，協助將熱量帶離水箱。"
            : "啟動加熱棒並減少新鮮水補入量，等待水溫回穩。",
          "用手持溫度計交叉驗證，排除探頭結垢造成的誤判。",
          "檢查循環泵葉輪與管線是否阻塞。",
          "觀察魚群是否浮頭或活力下降，必要時暫停餵食。",
          "拍照記錄探頭與水箱現況，留存於事件紀錄。",
        ];
  }
  if (ctx.deviceType === "sensor_ph") {
    return isEn
      ? [
          dir === "above"
            ? "Dose pH-down buffer in small increments (10% of the calculated amount) and recirculate for 10 minutes."
            : "Dose pH-up buffer in small increments and verify alkalinity hasn't crashed.",
          "Re-calibrate the probe with fresh 4.00 / 7.00 buffer if the last cal is older than 14 days.",
          "Check nitrification: high ammonia or rapid nitrate swings drive pH excursions.",
          "Confirm CO₂ injection (if used) hasn't drifted from its setpoint.",
          "Re-test in 15 minutes before further dosing — over-correction is the most common mistake.",
        ]
      : [
          dir === "above"
            ? "分次少量加入 pH 緩衝劑 (建議計算量的 10%)，循環 10 分鐘後再測。"
            : "分次少量加入升 pH 緩衝劑，並確認鹼度未崩。",
          "若上次校正已逾 14 天，請使用新鮮 4.00 / 7.00 校正液重新校正探頭。",
          "檢查硝化系統：氨或硝酸鹽快速變化會帶動 pH 漂移。",
          "若有施用 CO₂，確認注入量未偏離設定值。",
          "15 分鐘後再次測量，避免過度修正導致反向偏離。",
        ];
  }
  if (ctx.deviceType === "sensor_level") {
    return isEn
      ? [
          dir === "below"
            ? "Verify the make-up water valve is open and the float switch hasn't stuck."
            : "Verify the overflow drain is clear and the float switch hasn't stuck shut.",
          "Inspect all tank connections for visible leaks or evaporation rate spikes.",
          "Confirm the pump pressure reading is in its normal band.",
          "If level continues drifting, switch the zone pump to manual mode.",
          "Notify operations and log the time of the level crossing.",
        ]
      : [
          dir === "below"
            ? "確認補水閥已開啟，且浮球開關未卡住。"
            : "確認溢流排水暢通，且浮球開關未卡在關閉位置。",
          "檢查所有水箱接頭是否漏水或蒸發異常。",
          "確認水泵壓力是否在正常範圍。",
          "若水位持續偏移，將該區水泵切換至手動模式。",
          "通知運維並記錄水位異常的時間點。",
        ];
  }
  if (ctx.deviceType === "sensor_do") {
    return isEn
      ? [
          dir === "below"
            ? "Increase aeration immediately — start the secondary blower or open the venturi line."
            : "Check the aerator for over-driving and verify the DO membrane hasn't been replaced too recently (gives high reads while equilibrating).",
          "Confirm circulation flow and prefilter pressure — clogged biofilters starve fish of oxygen.",
          "Test temperature: warmer water holds less oxygen, so high temp + low DO is dangerous.",
          "Reduce feeding for the next two feeds if fish are visibly stressed.",
          "Re-check DO at 5-minute intervals until trend reverses.",
        ]
      : [
          dir === "below"
            ? "立即提高曝氣強度 — 啟動備援風機或打開文氏管。"
            : "檢查曝氣是否過強，並確認 DO 膜片是否剛更換（剛換時讀數會偏高）。",
          "確認循環流量與生物濾池壓力 — 阻塞會直接造成缺氧。",
          "檢查水溫：水溫越高溶氧越低，高溫 + 低 DO 是高風險組合。",
          "若魚群明顯緊迫，接下來兩餐減量餵食。",
          "每 5 分鐘重測 DO，直到趨勢反轉。",
        ];
  }
  // Generic
  return isEn
    ? [
        "Verify the related control hardware is operating normally.",
        "Inspect the sensor probe for fouling or air bubbles; clean if needed.",
        "Cross-check against a second device if available.",
        "Observe fish and plant behaviour for downstream impact.",
        "Escalate to on-call if no recovery within 30 minutes.",
      ]
    : [
        "確認相關控制設備是否正常運作。",
        "檢查感測器探頭是否有積污或氣泡，必要時清潔。",
        "若有其他冗餘設備，請交叉比對讀數。",
        "觀察魚群與植物是否出現下游影響。",
        "若 30 分鐘內未恢復，請通知值班。",
      ];
}

function streamDeterministic(ctx: AnalysisContext): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const script = buildDeterministicScript(ctx);
  return new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      send({ type: "start", source: "deterministic" });

      const started = Date.now();
      // Stream a few chars at a time so the UI gets the "typing" effect.
      // [\s\S] (not `.`) so we don't silently drop the newlines that the
      // markdown renderer relies on for headings / list / paragraph breaks.
      const tokens = script.match(/[\s\S]{1,6}/g) ?? [script];
      for (const tok of tokens) {
        send({ type: "chunk", content: tok });
        await new Promise((r) => setTimeout(r, 20));
      }

      send({ type: "done", durationMs: Date.now() - started });
      controller.close();
    },
  });
}

// ─── Anthropic streaming ────────────────────────────────────────────────────

async function streamFromAnthropic(
  ctx: AnalysisContext,
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = process.env.ANTHROPIC_API_KEY!;
  const model = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";

  const prompt = buildPrompt(ctx);

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 600,
      stream: true,
      system:
        "You are an aquaponics operations assistant. When asked about an anomaly, reply in concise Markdown: a short context sentence, then a numbered list of 4-6 concrete remediation steps tailored to the sensor type. Do not invent values; only reference the readings provided.",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  // If the upstream call fails (bad key, rate limit, etc.) fall back to the
  // deterministic script so the user always gets a useful response.
  if (!upstream.ok || !upstream.body) {
    return streamDeterministic(ctx);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  return new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      send({ type: "start", source: "anthropic" });
      const started = Date.now();
      const reader = upstream.body!.getReader();
      let buffer = "";

      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";
          for (const raw of events) {
            for (const line of raw.split("\n")) {
              if (!line.startsWith("data:")) continue;
              const payload = line.slice(5).trim();
              if (!payload || payload === "[DONE]") continue;
              try {
                const evt = JSON.parse(payload) as {
                  type: string;
                  delta?: { type?: string; text?: string };
                };
                if (
                  evt.type === "content_block_delta" &&
                  evt.delta?.type === "text_delta" &&
                  evt.delta.text
                ) {
                  send({ type: "chunk", content: evt.delta.text });
                }
              } catch {
                // ignore malformed lines
              }
            }
          }
        }
      } finally {
        send({ type: "done", durationMs: Date.now() - started });
        controller.close();
      }
    },
  });
}

function buildPrompt(ctx: AnalysisContext): string {
  const isEn = ctx.locale === "en";
  const v =
    ctx.currentValue == null
      ? "(unknown)"
      : `${ctx.currentValue}${ctx.unit}`;
  const range =
    ctx.safeMin != null && ctx.safeMax != null
      ? `${ctx.safeMin}${ctx.unit} – ${ctx.safeMax}${ctx.unit}`
      : "(not configured)";

  return [
    `Locale: ${isEn ? "English" : "Traditional Chinese (繁體中文)"}`,
    `Severity: ${ctx.severity}`,
    `Device: ${ctx.deviceName} (${ctx.deviceType || "unknown type"})`,
    `Metric: ${ctx.metricLabel}`,
    `Current reading: ${v}`,
    `Safe range: ${range}`,
    `Direction of breach: ${ctx.direction}`,
    `Alert message: ${ctx.alertMessage}`,
    ``,
    `Reply in the locale above. Format as Markdown with a short heading, a one-sentence context, and a numbered list of 4-6 specific remediation steps for this exact sensor type and breach direction. Don't restate the data; act on it.`,
  ].join("\n");
}
