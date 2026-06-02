"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/hooks/useT";
import { api } from "@/lib/axios";

interface AnalyticsChartProps {
  title: string;
  deviceId: string;
  color?: string;
  unit?: string;
}

interface HistoryResponse {
  deviceId: string;
  readings: { t: string; v: number; unit: string }[];
}

export function AnalyticsChart({
  title,
  deviceId,
  color = "#2E7D32",
  unit = "",
}: AnalyticsChartProps) {
  const { t } = useT();
  const { data, isLoading } = useQuery({
    queryKey: ["history", deviceId, 24],
    queryFn: async () => {
      const { data } = await api.get<HistoryResponse>("/api/history", {
        params: { deviceId, hours: 24 },
      });
      return data;
    },
    staleTime: 5 * 60_000,
  });

  const chartData =
    data?.readings.map((r) => ({
      t: format(new Date(r.t), "HH:mm"),
      v: r.v,
    })) ?? [];

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-foreground">
            {title}
          </h3>
          <span className="text-xs text-muted-foreground">
            {t("analytics.chart.range24h")}
          </span>
        </div>
        {isLoading ? (
          <Skeleton className="h-50 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid stroke="#EAECEF" strokeDasharray="3 3" />
              <XAxis
                dataKey="t"
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
                width={32}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid #E4E7EC",
                }}
                formatter={(value) => [`${value}${unit}`, ""]}
              />
              <Line
                type="monotone"
                dataKey="v"
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
