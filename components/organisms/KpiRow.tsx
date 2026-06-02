"use client";

import { useQuery } from "@tanstack/react-query";

import {
  MetricKpiCard,
  MetricKpiCardSkeleton,
} from "@/components/molecules/MetricKpiCard";
import { useChartRefreshMs } from "@/hooks/useAppSettings";
import { api } from "@/lib/axios";
import type { KpisResponse } from "@/types/api";

export function KpiRow() {
  const refreshMs = useChartRefreshMs();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-kpis"],
    queryFn: async () => {
      const { data } = await api.get<KpisResponse>("/api/dashboard/kpis");
      return data;
    },
    staleTime: refreshMs,
    refetchInterval: refreshMs,
  });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricKpiCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {data.kpis.map((kpi) => (
        <MetricKpiCard key={kpi.key} kpi={kpi} />
      ))}
    </div>
  );
}
