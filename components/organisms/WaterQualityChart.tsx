"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useChartRefreshMs } from "@/hooks/useAppSettings";
import { useT } from "@/hooks/useT";
import { api } from "@/lib/axios";
import type { WaterQualityResponse } from "@/types/api";

export function WaterQualityChart() {
  const { t, dateLocale } = useT();
  // 7-day chart refreshes more slowly than KPIs — use 4× the configured rate,
  // capped at 5 min, since daily buckets won't change minute-to-minute.
  const baseMs = useChartRefreshMs();
  const refreshMs = Math.min(baseMs * 4, 5 * 60_000);
  const { data, isLoading } = useQuery({
    queryKey: ["water-quality", 7],
    queryFn: async () => {
      const { data } = await api.get<WaterQualityResponse>(
        "/api/dashboard/water-quality",
        { params: { days: 7 } },
      );
      return data;
    },
    staleTime: refreshMs,
    refetchInterval: refreshMs,
  });

  const chartData =
    data?.series.map((p) => ({
      day: format(new Date(p.ts), "EEE", { locale: dateLocale }),
      pH: p.ph,
      Temp: p.temp,
      DO: p.do,
    })) ?? [];

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-foreground">
            {t("dashboard.chart.title")}
          </h3>
        </div>
        {isLoading ? (
          <Skeleton className="h-65 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 8, left: -16, bottom: 0 }}
            >
              <defs>
                <linearGradient id="grad-ph" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#81C784" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="#81C784" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="grad-temp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#4CAF50" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="grad-do" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2E7D32" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#2E7D32" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#EAECEF" strokeDasharray="3 3" />
              <XAxis
                dataKey="day"
                stroke="#9CA3AF"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#9CA3AF"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                domain={[0, 30]}
                ticks={[0, 5, 10, 15, 20, 25, 30]}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid #E4E7EC",
                }}
              />
              <Legend
                verticalAlign="top"
                height={28}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingBottom: 4 }}
              />
              <Area
                type="monotone"
                dataKey="pH"
                name={t("dashboard.chart.legend.ph")}
                stroke="#81C784"
                strokeWidth={2}
                fill="url(#grad-ph)"
              />
              <Area
                type="monotone"
                dataKey="Temp"
                name={t("dashboard.chart.legend.temp")}
                stroke="#4CAF50"
                strokeWidth={2}
                fill="url(#grad-temp)"
              />
              <Area
                type="monotone"
                dataKey="DO"
                name={t("dashboard.chart.legend.do")}
                stroke="#2E7D32"
                strokeWidth={2}
                fill="url(#grad-do)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
