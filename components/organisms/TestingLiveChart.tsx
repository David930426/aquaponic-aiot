"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useChartRefreshMs } from "@/hooks/useAppSettings";
import { useT } from "@/hooks/useT";
import { api } from "@/lib/axios";
import { useZoneStore } from "@/store/useZoneStore";

interface RecentDevice {
  id: string;
  name: string;
  deviceType: string;
  unit: string;
}
interface RecentReading {
  ts: number;
  deviceId: string;
  value: number;
}
interface RecentReadingsResponse {
  minutes: number;
  devices: RecentDevice[];
  readings: RecentReading[];
}

const DEVICE_COLORS: Record<string, string> = {
  sensor_ph: "#2E7D32",
  sensor_temp: "#F59E0B",
  sensor_do: "#1565C0",
  sensor_level: "#0EA5E9",
  sensor_flow: "#7C3AED",
};

export function TestingLiveChart() {
  const { t } = useT();
  const zoneId = useZoneStore((s) => s.selectedZoneId);
  const [minutes, setMinutes] = useState(30);
  const refreshMs = useChartRefreshMs();

  const { data, isLoading } = useQuery({
    queryKey: ["recent-readings", zoneId, minutes],
    queryFn: async () => {
      const { data } = await api.get<RecentReadingsResponse>(
        "/api/dashboard/recent-readings",
        { params: { zoneId, minutes } },
      );
      return data;
    },
    refetchInterval: refreshMs,
    staleTime: refreshMs,
  });

  const { chartData, devices } = useMemo(() => {
    const devices = data?.devices ?? [];
    if (!data) return { chartData: [], devices };
    const byTs = new Map<number, Record<string, number | string>>();
    for (const r of data.readings) {
      const minuteTs = Math.floor(r.ts / 60_000) * 60_000;
      let bucket = byTs.get(minuteTs);
      if (!bucket) {
        bucket = { ts: minuteTs };
        byTs.set(minuteTs, bucket);
      }
      bucket[r.deviceId] = Number(r.value.toFixed(2));
    }
    const chartData = Array.from(byTs.values()).sort(
      (a, b) => (a.ts as number) - (b.ts as number),
    );
    return { chartData, devices };
  }, [data]);

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">
              {t("testing.chart.title")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("testing.chart.subtitle", { minutes })}
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="chart-window">
              {t("testing.chart.minutesLabel")}
            </Label>
            <Input
              id="chart-window"
              type="number"
              min={1}
              max={720}
              value={minutes}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n) && n >= 1) setMinutes(n);
              }}
              className="w-28"
            />
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-65 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid stroke="#EAECEF" strokeDasharray="3 3" />
              <XAxis
                dataKey="ts"
                stroke="#9CA3AF"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => format(new Date(v as number), "HH:mm")}
                type="number"
                domain={["dataMin", "dataMax"]}
                scale="time"
              />
              <YAxis
                stroke="#9CA3AF"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid #E4E7EC",
                }}
                labelFormatter={(v) =>
                  format(new Date(v as number), "yyyy-MM-dd HH:mm:ss")
                }
              />
              <Legend
                verticalAlign="top"
                height={28}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingBottom: 4 }}
              />
              {devices.map((d) => (
                <Line
                  key={d.id}
                  type="monotone"
                  dataKey={d.id}
                  name={d.name}
                  stroke={DEVICE_COLORS[d.deviceType] ?? "#4CAF50"}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
