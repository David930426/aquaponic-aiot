"use client";

import { format, isToday, isYesterday } from "date-fns";
import { AlertTriangle, Info, ShieldAlert, type LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAlerts } from "@/hooks/useAlerts";
import { useT } from "@/hooks/useT";
import { useZoneStore } from "@/store/useZoneStore";
import type { AlertSeverity } from "@/types/api";

const severityIcon: Record<AlertSeverity, LucideIcon> = {
  critical: ShieldAlert,
  warning: AlertTriangle,
  info: Info,
};

const severityColor: Record<AlertSeverity, string> = {
  critical: "text-[#B91C1C]",
  warning: "text-[#E65100]",
  info: "text-[#1D4ED8]",
};

export function RecentAlertsList() {
  const { t, dateLocale } = useT();
  const zoneId = useZoneStore((s) => s.selectedZoneId);
  const { data, isLoading } = useAlerts(zoneId);

  const formatWhen = (iso: string) => {
    const d = new Date(iso);
    if (isToday(d)) return format(d, "p", { locale: dateLocale });
    if (isYesterday(d))
      return `${t("dashboard.recentAlerts.yesterday")}, ${format(d, "p", {
        locale: dateLocale,
      })}`;
    return format(d, "MMM d, p", { locale: dateLocale });
  };

  const recent = data?.slice(0, 4) ?? [];

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col p-5">
        <h3 className="mb-4 text-[15px] font-semibold text-foreground">
          {t("dashboard.recentAlerts.title")}
        </h3>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("alerts.empty.title")}
          </p>
        ) : (
          <ul className="space-y-4">
            {recent.map((a) => {
              const Icon = severityIcon[a.severity];
              const color = severityColor[a.severity];
              return (
                <li key={a.id} className="flex items-start gap-3">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
                  <div className="flex-1 leading-tight">
                    <p className="text-sm text-foreground">
                      <span className="font-semibold">{a.deviceName}:</span>{" "}
                      {a.message}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      ({formatWhen(a.triggeredAt)})
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
