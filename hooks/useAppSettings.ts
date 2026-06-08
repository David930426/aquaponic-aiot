"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/axios";
import type { AppSettings } from "@/lib/settings";

export type AppSettingsView = AppSettings;

/**
 * Fetch app-wide settings (data source, poll interval, chart refresh, retention).
 */
export function useAppSettings() {
  return useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data } = await api.get<{ settings: AppSettingsView }>(
        "/api/settings",
      );
      return data.settings;
    },
    staleTime: 60_000,
    // Don't refetch on focus — settings change rarely and we don't want
    // chart refresh intervals to jump around when the user alt-tabs.
    refetchOnWindowFocus: false,
  });
}

/** Refresh interval (ms) for charts/lists. Defaults to 15s while settings load. */
export function useChartRefreshMs(): number {
  const { data } = useAppSettings();
  return (data?.chartRefreshSec ?? 15) * 1000;
}
