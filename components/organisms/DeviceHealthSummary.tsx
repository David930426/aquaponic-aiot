"use client";

import {
  HealthSummaryCard,
  HealthSummaryCardSkeleton,
} from "@/components/molecules/HealthSummaryCard";
import { useHealthSummary } from "@/hooks/useHealthSummary";
import { useT } from "@/hooks/useT";
import type { MessageKey } from "@/lib/i18n/messages";
import { useZoneStore } from "@/store/useZoneStore";

const labelKey: Record<string, MessageKey> = {
  system_status: "dashboard.healthSummary.systemStatus",
  sensor_health: "dashboard.healthSummary.sensorHealth",
  connection_stability: "dashboard.healthSummary.connectionStability",
};

const stateKey: Record<string, MessageKey> = {
  optimal: "health.optimal",
  good: "health.good",
  fair: "health.fair",
  poor: "health.poor",
  strong: "health.strong",
  stable: "health.stable",
  weak: "health.weak",
  warning: "health.fair",
  critical: "health.poor",
};

export function DeviceHealthSummary() {
  const zoneId = useZoneStore((s) => s.selectedZoneId);
  const { t } = useT();
  const { data, isLoading, error } = useHealthSummary(zoneId);

  return (
    <section>
      <h2 className="mb-4 text-[18px] font-semibold text-foreground">
        {t("dashboard.healthSummary.title")}
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {isLoading || error
          ? Array.from({ length: 3 }).map((_, i) => (
              <HealthSummaryCardSkeleton key={i} />
            ))
          : data?.summary.map((item) => (
              <HealthSummaryCard
                key={item.key}
                label={t(labelKey[item.key] ?? "dashboard.healthSummary.systemStatus")}
                value={`${t(stateKey[item.state] ?? "health.good")} (${item.percent}%)`}
                percent={item.percent}
              />
            ))}
      </div>
    </section>
  );
}
