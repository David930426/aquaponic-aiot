"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/axios";
import type {
  ThresholdSettings,
  ThresholdSettingsPatch,
} from "@/lib/thresholds";

export function useThresholds() {
  return useQuery({
    queryKey: ["threshold-settings"],
    queryFn: async () => {
      const { data } = await api.get<{ thresholds: ThresholdSettings }>(
        "/api/settings/thresholds",
      );
      return data.thresholds;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useUpdateThresholds() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: ThresholdSettingsPatch) => {
      const { data } = await api.patch<{ thresholds: ThresholdSettings }>(
        "/api/settings/thresholds",
        patch,
      );
      return data.thresholds;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threshold-settings"] });
    },
  });
}
