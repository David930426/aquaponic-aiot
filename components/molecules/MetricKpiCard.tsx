"use client";

import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  CircleMinus,
  Droplet,
  FlaskConical,
  type LucideIcon,
  Thermometer,
  Waves,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/hooks/useT";
import type { MessageKey } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";
import type { KpiCard, KpiTrend } from "@/types/api";

interface MetricKpiCardProps {
  kpi: KpiCard;
}

interface IconMeta {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  labelKey: MessageKey;
  formatValue: (v: number, unit: string) => string;
}

const META: Record<KpiCard["key"], IconMeta> = {
  ph: {
    icon: FlaskConical,
    iconBg: "#E8F5E9",
    iconColor: "#2E7D32",
    labelKey: "dashboard.kpi.phLevel",
    formatValue: (v) => v.toFixed(1),
  },
  temp: {
    icon: Thermometer,
    iconBg: "#E8F5E9",
    iconColor: "#2E7D32",
    labelKey: "dashboard.kpi.temperature",
    formatValue: (v, u) => `${v.toFixed(1)}${u}`,
  },
  do: {
    icon: Droplet,
    iconBg: "#E8F5E9",
    iconColor: "#2E7D32",
    labelKey: "dashboard.kpi.dissolvedOxygen",
    formatValue: (v, u) => `${v.toFixed(1)} ${u}`,
  },
  level: {
    icon: Waves,
    iconBg: "#E8F5E9",
    iconColor: "#2E7D32",
    labelKey: "dashboard.kpi.waterLevel",
    formatValue: (v) => `${Math.round(v)}%`,
  },
};

interface TrendMeta {
  icon: LucideIcon;
  color: string;
  labelKey: MessageKey;
}

const TREND_META: Record<KpiTrend, TrendMeta> = {
  stable: {
    icon: ArrowUp,
    color: "text-[#2E7D32]",
    labelKey: "dashboard.kpi.trend.stable",
  },
  increasing: {
    icon: ArrowUp,
    color: "text-[#E65100]",
    labelKey: "dashboard.kpi.trend.increasing",
  },
  decreasing: {
    icon: ArrowDown,
    color: "text-[#1565C0]",
    labelKey: "dashboard.kpi.trend.decreasing",
  },
  optimal: {
    icon: CircleMinus,
    color: "text-[#2E7D32]",
    labelKey: "dashboard.kpi.trend.optimal",
  },
  normal: {
    icon: CheckCircle2,
    color: "text-[#2E7D32]",
    labelKey: "dashboard.kpi.trend.normal",
  },
};

function formatDelta(kpi: KpiCard): string {
  if (kpi.trend === "optimal" || kpi.trend === "normal") return "";
  const sign = kpi.delta > 0 ? "+" : "";
  if (kpi.key === "temp") return `(${sign}${kpi.delta.toFixed(1)}°C)`;
  if (kpi.key === "ph") return `(${sign}${kpi.delta.toFixed(1)})`;
  if (kpi.key === "do") return `(${sign}${kpi.delta.toFixed(1)} mg/L)`;
  return `(${sign}${Math.round(kpi.delta)}%)`;
}

export function MetricKpiCard({ kpi }: MetricKpiCardProps) {
  const { t } = useT();
  const meta = META[kpi.key];
  const Icon = meta.icon;
  const trend = TREND_META[kpi.trend];
  const TrendIcon = trend.icon;
  const delta = formatDelta(kpi);

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {t(meta.labelKey)}
            </p>
            <p className="mt-2 text-[28px] font-bold leading-none text-foreground">
              {meta.formatValue(kpi.value, kpi.unit)}
            </p>
          </div>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ backgroundColor: meta.iconBg }}
            aria-hidden
          >
            <Icon className="h-4.5 w-4.5" style={{ color: meta.iconColor }} />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-1.5 text-xs">
          <TrendIcon className={cn("h-3.5 w-3.5", trend.color)} />
          <span className={cn("font-medium", trend.color)}>
            {t(trend.labelKey)}
          </span>
          {delta && <span className="text-muted-foreground">{delta}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

export function MetricKpiCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-20" />
          </div>
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
        <Skeleton className="mt-4 h-3 w-28" />
      </CardContent>
    </Card>
  );
}
