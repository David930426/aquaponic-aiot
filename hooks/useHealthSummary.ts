"use client";

import { useQuery } from "@tanstack/react-query";

import { useChartRefreshMs } from "@/hooks/useAppSettings";
import { api } from "@/lib/axios";
import type { HealthSummaryResponse } from "@/types/api";

export function useHealthSummary(zoneId: string) {
  const refreshMs = useChartRefreshMs();
  return useQuery({
    queryKey: ["health-summary", zoneId],
    queryFn: async () => {
      const { data } = await api.get<HealthSummaryResponse>(
        "/api/devices/health-summary",
        { params: { zoneId } },
      );
      return data;
    },
    staleTime: refreshMs,
    refetchInterval: refreshMs,
  });
}
