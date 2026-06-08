"use client";

import { useState } from "react";
import axios from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppSettings, type AppSettingsView } from "@/hooks/useAppSettings";
import { useT } from "@/hooks/useT";
import { api } from "@/lib/axios";
import type { DataSource } from "@/lib/settings";

export default function DataSourcePage() {
  const { t } = useT();
  const { data, isLoading } = useAppSettings();
  const queryClient = useQueryClient();

  const [local, setLocal] = useState<AppSettingsView | null>(null);
  // Sync server data into editable local state via render-time comparison —
  // React's documented escape hatch for "adjust state on prop change".
  const [prevData, setPrevData] = useState<typeof data>(undefined);
  if (data !== prevData) {
    setPrevData(data);
    if (data) setLocal(data);
  }

  const mutation = useMutation({
    mutationFn: async (patch: Partial<AppSettingsView>) => {
      const { data } = await api.patch<{ settings: AppSettingsView }>(
        "/api/settings",
        patch,
      );
      return data.settings;
    },
    onSuccess: () => {
      toast.success(t("settings.dataSource.saved"));
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
    },
    onError: (err) => {
      const msg =
        (axios.isAxiosError(err) &&
          (err.response?.data as { message?: string } | undefined)?.message) ||
        t("settings.dataSource.saveFailed");
      toast.error(msg);
    },
  });

  if (isLoading || !local) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const save = () => {
    mutation.mutate({
      dataSource: local.dataSource,
      pollIntervalSec: local.pollIntervalSec,
      chartRefreshSec: local.chartRefreshSec,
      sensorRetentionDays: local.sensorRetentionDays,
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t("settings.dataSource.subtitle")}
      </p>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="space-y-1.5">
            <Label>{t("settings.dataSource.mode")}</Label>
            <Select
              value={local.dataSource}
              onValueChange={(v) =>
                setLocal({ ...local, dataSource: v as DataSource })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="passive">
                  {t("settings.dataSource.mode.passive")}
                </SelectItem>
                <SelectItem value="live">
                  {t("settings.dataSource.mode.live")}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {local.dataSource === "passive"
                ? t("settings.dataSource.mode.passive.hint")
                : t("settings.dataSource.mode.live.hint")}
            </p>
          </div>

          {local.dataSource === "live" && (
            <div className="space-y-1.5">
              <Label htmlFor="poll-interval">
                {t("settings.dataSource.pollInterval")}
              </Label>
              <Input
                id="poll-interval"
                type="number"
                min={5}
                max={3600}
                value={local.pollIntervalSec}
                onChange={(e) =>
                  setLocal({ ...local, pollIntervalSec: Number(e.target.value) })
                }
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">
                {t("settings.dataSource.pollInterval.hint")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <h3 className="text-sm font-semibold text-foreground">
            {t("settings.dataSource.dashboardSection")}
          </h3>

          <div className="space-y-1.5">
            <Label htmlFor="refresh">
              {t("settings.dataSource.chartRefresh")}
            </Label>
            <Select
              value={String(local.chartRefreshSec)}
              onValueChange={(v) =>
                setLocal({ ...local, chartRefreshSec: Number(v) })
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5s</SelectItem>
                <SelectItem value="10">10s</SelectItem>
                <SelectItem value="15">15s</SelectItem>
                <SelectItem value="30">30s</SelectItem>
                <SelectItem value="60">1m</SelectItem>
                <SelectItem value="300">5m</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t("settings.dataSource.chartRefresh.hint")}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="retention">
              {t("settings.dataSource.retention")}
            </Label>
            <Input
              id="retention"
              type="number"
              min={1}
              max={365}
              value={local.sensorRetentionDays}
              onChange={(e) =>
                setLocal({
                  ...local,
                  sensorRetentionDays: Number(e.target.value),
                })
              }
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              {t("settings.dataSource.retention.hint")}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={mutation.isPending}>
          {mutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {t("settings.dataSource.save")}
        </Button>
      </div>
    </div>
  );
}
