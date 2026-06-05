"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useChartRefreshMs } from "@/hooks/useAppSettings";
import { useT } from "@/hooks/useT";
import { api } from "@/lib/axios";

interface AnomalyRow {
  id: string;
  deviceId: string;
  deviceName: string;
  value: number;
  unit: string | null;
  safeMin: number | null;
  safeMax: number | null;
  severity: "warning" | "critical";
  alertId: string | null;
  recordedAt: string;
}

function formatReading(value: number, unit: string | null): string {
  // Strip trailing zeros so 22.00°C → 22°C, but keep 22.5°C as-is.
  const trimmed = Number(value.toFixed(2)).toString();
  return `${trimmed}${unit ?? ""}`;
}

function formatRange(
  min: number | null,
  max: number | null,
  unit: string | null,
): string {
  if (min == null || max == null) return "—";
  const u = unit ?? "";
  return `${min}${u}–${max}${u}`;
}

export function TestingAnomalies() {
  const { t, dateLocale } = useT();
  const refreshMs = useChartRefreshMs();
  const seenIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: ["recent-anomalies"],
    queryFn: async () => {
      const { data } = await api.get<{ anomalies: AnomalyRow[] }>(
        "/api/anomalies",
        { params: { days: 1, limit: 50 } },
      );
      return data.anomalies;
    },
    refetchInterval: refreshMs,
    staleTime: refreshMs,
  });

  // Toast on newly-arriving anomalies (skip the first batch so we don't
  // flood with old ones when the page first loads).
  useEffect(() => {
    if (!data) return;
    if (!initialized.current) {
      data.forEach((a) => seenIds.current.add(a.id));
      initialized.current = true;
      return;
    }
    for (const a of data) {
      if (seenIds.current.has(a.id)) continue;
      seenIds.current.add(a.id);
      const reading = formatReading(a.value, a.unit);
      const range = formatRange(a.safeMin, a.safeMax, a.unit);
      const description =
        range === "—"
          ? t("testing.anomaly.toastBodyNoRange", { reading })
          : t("testing.anomaly.toastBody", { reading, range });
      const notify = a.severity === "critical" ? toast.error : toast.warning;
      notify(a.deviceName, { description });
    }
  }, [data, t]);

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <h3 className="text-[15px] font-semibold text-foreground">
          {t("testing.table.title")}
        </h3>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : !data?.length ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("testing.table.empty")}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("testing.table.device")}</TableHead>
                <TableHead>{t("testing.table.value")}</TableHead>
                <TableHead>{t("testing.table.range")}</TableHead>
                <TableHead>{t("testing.table.severity")}</TableHead>
                <TableHead className="text-right">
                  {t("testing.table.at")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.deviceName}</TableCell>
                  <TableCell>{formatReading(a.value, a.unit)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatRange(a.safeMin, a.safeMax, a.unit)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        a.severity === "critical" ? "destructive" : "secondary"
                      }
                    >
                      {t(
                        a.severity === "critical"
                          ? "alerts.severity.critical"
                          : "alerts.severity.warning",
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {format(new Date(a.recordedAt), "HH:mm:ss", {
                      locale: dateLocale,
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
