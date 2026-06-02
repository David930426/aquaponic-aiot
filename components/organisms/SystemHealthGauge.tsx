"use client";

import { useQuery } from "@tanstack/react-query";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useChartRefreshMs } from "@/hooks/useAppSettings";
import { useT } from "@/hooks/useT";
import { api } from "@/lib/axios";
import type { MessageKey } from "@/lib/i18n/messages";
import { useZoneStore } from "@/store/useZoneStore";
import type { SystemHealthResponse } from "@/types/api";

const overallLabelKey: Record<string, MessageKey> = {
  Excellent: "dashboard.systemHealth.label.excellent",
  Good: "dashboard.systemHealth.label.good",
  Fair: "dashboard.systemHealth.label.fair",
  Poor: "dashboard.systemHealth.label.poor",
};

const pumpStatusKey: Record<string, MessageKey> = {
  Active: "dashboard.systemHealth.pump.active",
  Idle: "dashboard.systemHealth.pump.idle",
};

// SVG arc generator for the half-donut.
function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngleDeg: number,
  endAngleDeg: number,
): string {
  const toRad = (a: number) => ((a - 90) * Math.PI) / 180;
  const start = {
    x: cx + radius * Math.cos(toRad(endAngleDeg)),
    y: cy + radius * Math.sin(toRad(endAngleDeg)),
  };
  const end = {
    x: cx + radius * Math.cos(toRad(startAngleDeg)),
    y: cy + radius * Math.sin(toRad(startAngleDeg)),
  };
  const largeArc = endAngleDeg - startAngleDeg <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function Gauge({ percent }: { percent: number }) {
  const cx = 120;
  const cy = 120;
  const radius = 90;
  const startAngle = -90;
  const endAngle = 90;
  const valueAngle = startAngle + ((endAngle - startAngle) * percent) / 100;

  return (
    <svg
      viewBox="0 0 240 140"
      role="img"
      aria-label={`Overall system health ${percent}%`}
      className="h-37.5 w-full"
    >
      <path
        d={describeArc(cx, cy, radius, startAngle, endAngle)}
        stroke="#E8F5E9"
        strokeWidth={18}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={describeArc(cx, cy, radius, startAngle, valueAngle)}
        stroke="#2E7D32"
        strokeWidth={18}
        fill="none"
        strokeLinecap="round"
      />
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        fontSize="32"
        fontWeight={700}
        fill="hsl(220 13% 13%)"
      >
        {percent}%
      </text>
    </svg>
  );
}

export function SystemHealthGauge() {
  const { t } = useT();
  const zoneId = useZoneStore((s) => s.selectedZoneId);
  const refreshMs = useChartRefreshMs() * 2;
  const { data, isLoading } = useQuery({
    queryKey: ["system-health", zoneId],
    queryFn: async () => {
      const { data } = await api.get<SystemHealthResponse>(
        "/api/dashboard/system-health",
        { params: { zoneId } },
      );
      return data;
    },
    staleTime: refreshMs,
    refetchInterval: refreshMs,
  });

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col p-5">
        <h3 className="mb-2 text-[15px] font-semibold text-foreground">
          {t("dashboard.systemHealth.title")}
        </h3>

        {isLoading || !data ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <Skeleton className="h-37.5 w-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : (
          <>
            <div className="flex flex-1 flex-col items-center justify-center">
              <Gauge percent={data.percent} />
              <p className="mt-1 text-sm text-muted-foreground">
                {t("dashboard.systemHealth.overallStatus")}:{" "}
                <span className="font-semibold text-foreground">
                  {t(overallLabelKey[data.overallLabel] ?? "dashboard.systemHealth.label.good")}
                </span>
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {t("dashboard.systemHealth.sensorsOnline")}:{" "}
                <span className="font-semibold text-foreground">
                  {data.sensorsOnline}/{data.sensorsTotal}
                </span>
              </span>
              <span className="text-muted-foreground">
                {t("dashboard.systemHealth.pumpStatus")}:{" "}
                <span className="font-semibold text-[#2E7D32]">
                  {t(pumpStatusKey[data.pumpStatus] ?? "dashboard.systemHealth.pump.idle")}
                </span>
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
