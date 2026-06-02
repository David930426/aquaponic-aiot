"use client";

import { AnalyticsChart } from "@/components/organisms/AnalyticsChart";
import { useT } from "@/hooks/useT";

export default function AnalyticsPage() {
  const { t } = useT();
  return (
    <div className="mx-auto max-w-350">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold text-foreground">
          {t("analytics.page.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("analytics.page.subtitle")}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <AnalyticsChart
          title={t("analytics.chart.waterTemperature")}
          deviceId="dev-002"
          color="#1565C0"
          unit="°C"
        />
        <AnalyticsChart
          title={t("analytics.chart.phLevel")}
          deviceId="dev-003"
          color="#2E7D32"
          unit=""
        />
        <AnalyticsChart
          title={t("analytics.chart.waterLevel")}
          deviceId="dev-006"
          color="#0EA5E9"
          unit="%"
        />
      </div>
    </div>
  );
}
