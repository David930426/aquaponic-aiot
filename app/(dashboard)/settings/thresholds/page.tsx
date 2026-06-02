"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/hooks/useT";

const thresholds = [
  {
    labelKey: "settings.thresholds.label.temp" as const,
    device: "Water Temp Sensor",
    min: "18°C",
    max: "25°C",
  },
  {
    labelKey: "settings.thresholds.label.ph" as const,
    device: "pH Sensor",
    min: "6.5",
    max: "7.5",
  },
  {
    labelKey: "settings.thresholds.label.level" as const,
    device: "Water Level Sensor",
    min: "60%",
    max: "95%",
  },
];

export default function ThresholdsPage() {
  const { t } = useT();
  return (
    <div className="mx-auto max-w-225">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold text-foreground">
          {t("settings.thresholds.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("settings.thresholds.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {thresholds.map((th) => (
          <Card key={th.labelKey}>
            <CardContent className="p-5">
              <p className="text-[15px] font-semibold text-foreground">
                {t(th.labelKey)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{th.device}</p>
              <div className="mt-4 flex items-baseline justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("settings.thresholds.min")}
                  </p>
                  <p className="text-lg font-semibold">{th.min}</p>
                </div>
                <div className="mx-3 mt-2 h-px flex-1 bg-[#EAECEF]" />
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {t("settings.thresholds.max")}
                  </p>
                  <p className="text-lg font-semibold">{th.max}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
