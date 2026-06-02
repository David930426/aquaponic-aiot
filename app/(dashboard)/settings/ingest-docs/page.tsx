"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/hooks/useT";

interface Endpoint {
  path: string;
  description: string;
  sample: object;
}

const SINGLE_ENDPOINTS: Endpoint[] = [
  {
    path: "/api/ingest/temp",
    description: "Water temperature reading in °C (typical safe range 18–25).",
    sample: { value: 23.4, recordedAt: "2026-06-03T08:30:00.000Z" },
  },
  {
    path: "/api/ingest/ph",
    description: "pH reading (typical safe range 6.5–7.5). Unitless.",
    sample: { value: 7.1 },
  },
  {
    path: "/api/ingest/level",
    description: "Water level as % full (typical safe range 60–95).",
    sample: { value: 82 },
  },
  {
    path: "/api/ingest/do",
    description: "Dissolved oxygen reading in mg/L (typical safe range 5–12).",
    sample: { value: 8.4 },
  },
];

export default function IngestDocsPage() {
  const { t } = useT();
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://your-app";

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(t("settings.ingestDocs.copied"));
  };

  const renderCurl = (ep: Endpoint) =>
    `curl -X POST '${origin}${ep.path}' \\
  -H 'Content-Type: application/json' \\
  -H 'X-API-Key: aqua_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' \\
  -d '${JSON.stringify(ep.sample)}'`;

  const batchSample = {
    readings: [
      {
        deviceId: "dev-003",
        value: 7.1,
        recordedAt: "2026-06-03T08:30:00.000Z",
      },
      { deviceId: "dev-002", value: 23.4 },
      { deviceId: "dev-008", value: 8.4 },
    ],
  };
  const batchCurl = `curl -X POST '${origin}/api/ingest/batch' \\
  -H 'Content-Type: application/json' \\
  -H 'X-API-Key: aqua_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' \\
  -d '${JSON.stringify(batchSample, null, 2).replace(/\n/g, "\n     ")}'`;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5">
          <h2 className="mb-2 text-base font-semibold text-foreground">
            {t("settings.ingestDocs.howItWorks")}
          </h2>
          <ol className="ml-4 list-decimal space-y-1.5 text-sm text-muted-foreground">
            <li>{t("settings.ingestDocs.step1")}</li>
            <li>{t("settings.ingestDocs.step2")}</li>
            <li>{t("settings.ingestDocs.step3")}</li>
            <li>{t("settings.ingestDocs.step4")}</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h2 className="mb-2 text-base font-semibold text-foreground">
            {t("settings.ingestDocs.body.title")}
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">
            {t("settings.ingestDocs.body.subtitle")}
          </p>
          <pre className="overflow-x-auto rounded-md bg-[hsl(220_9%_97%)] p-3 text-xs leading-relaxed">{`{
  "deviceId": "dev-003",         // optional — routes by sensor type if omitted
  "value": 7.1,                  // required — the numeric reading
  "unit": "°C",                  // optional — overrides device default
  "recordedAt": "2026-06-03T08:30:00.000Z",  // optional — defaults to now
  "zoneId": "zone-001"           // optional — defaults to zone-001
}`}</pre>
        </CardContent>
      </Card>

      {SINGLE_ENDPOINTS.map((ep) => (
        <Card key={ep.path}>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-[#E8F5E9] font-mono text-[#2E7D32]">
                  POST
                </Badge>
                <code className="font-mono text-sm font-semibold">
                  {ep.path}
                </code>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copy(renderCurl(ep))}
              >
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                {t("settings.ingestDocs.copyCurl")}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{ep.description}</p>
            <pre className="overflow-x-auto rounded-md bg-[hsl(220_9%_97%)] p-3 text-xs leading-relaxed">
              {renderCurl(ep)}
            </pre>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className="bg-[#E8F5E9] font-mono text-[#2E7D32]">
                POST
              </Badge>
              <code className="font-mono text-sm font-semibold">
                /api/ingest/batch
              </code>
            </div>
            <Button variant="outline" size="sm" onClick={() => copy(batchCurl)}>
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              {t("settings.ingestDocs.copyCurl")}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("settings.ingestDocs.batch.description")}
          </p>
          <pre className="overflow-x-auto rounded-md bg-[hsl(220_9%_97%)] p-3 text-xs leading-relaxed">
            {batchCurl}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h2 className="mb-2 text-base font-semibold text-foreground">
            {t("settings.ingestDocs.storage.title")}
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">
            {t("settings.ingestDocs.storage.body")}
          </p>
          <ul className="ml-4 list-disc space-y-1.5 text-sm text-muted-foreground">
            <li>{t("settings.ingestDocs.storage.bullet1")}</li>
            <li>{t("settings.ingestDocs.storage.bullet2")}</li>
            <li>{t("settings.ingestDocs.storage.bullet3")}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
