"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/axios";
import type { AlertItem } from "@/types/api";

export function useAlerts(zoneId: string) {
  return useQuery({
    queryKey: ["alerts", zoneId],
    queryFn: async () => {
      const { data } = await api.get<{ zoneId: string; alerts: AlertItem[] }>(
        "/api/alerts",
        { params: { zoneId } },
      );
      return data.alerts;
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

export function useMarkAllAlertsRead(zoneId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post(`/api/alerts/read-all`, null, { params: { zoneId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts", zoneId] });
    },
  });
}
