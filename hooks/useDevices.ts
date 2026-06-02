"use client";

import { useQuery } from "@tanstack/react-query";

import { useChartRefreshMs } from "@/hooks/useAppSettings";
import { api } from "@/lib/axios";
import type { DevicesResponse } from "@/types/api";

export function useDevices(zoneId: string) {
  const refreshMs = useChartRefreshMs();
  return useQuery({
    queryKey: ["devices", zoneId],
    queryFn: async () => {
      const { data } = await api.get<DevicesResponse>("/api/devices", {
        params: { zoneId },
      });
      return data;
    },
    staleTime: refreshMs,
    refetchInterval: refreshMs,
  });
}
