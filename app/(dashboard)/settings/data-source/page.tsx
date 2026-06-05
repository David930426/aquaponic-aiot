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
  // React's documented escape hatch for "adjust state on prop change" without
  // bouncing through useEffect (which triggers an extra commit + the
  // react-hooks/set-state-in-effect lint).
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
    const patch: Partial<AppSettingsView> = {
      dataSource: local.dataSource,
      externalApiUrl: local.externalApiUrl,
      simulatorIntervalSec: local.simulatorIntervalSec,
      chartRefreshSec: local.chartRefreshSec,
      sensorRetentionDays: local.sensorRetentionDays,
    };
    // Only send the token when the admin actually typed a new one
    // (the GET response masks it as "********").
    if (local.externalApiToken && local.externalApiToken !== "********") {
      patch.externalApiToken = local.externalApiToken;
    }
    mutation.mutate(patch);
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
                <SelectItem value="simulator">
                  {t("settings.dataSource.mode.simulator")}
                </SelectItem>
                <SelectItem value="external">
                  {t("settings.dataSource.mode.external")}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {local.dataSource === "passive" &&
                t("settings.dataSource.mode.passive.hint")}
              {local.dataSource === "simulator" &&
                t("settings.dataSource.mode.simulator.hint")}
              {local.dataSource === "external" &&
                t("settings.dataSource.mode.external.hint")}
            </p>
          </div>

          {local.dataSource === "simulator" && (
            <div className="space-y-1.5">
              <Label htmlFor="sim-interval">
                {t("settings.dataSource.simulatorInterval")}
              </Label>
              <Input
                id="sim-interval"
                type="number"
                min={1}
                max={3600}
                value={local.simulatorIntervalSec}
                onChange={(e) =>
                  setLocal({
                    ...local,
                    simulatorIntervalSec: Number(e.target.value),
                  })
                }
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">
                {t("settings.dataSource.simulatorInterval.hint")}
              </p>
            </div>
          )}

          {local.dataSource === "external" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="ext-url">
                  {t("settings.dataSource.externalUrl")}
                </Label>
                <Input
                  id="ext-url"
                  placeholder="https://my-iot-gateway.example.com/readings"
                  value={local.externalApiUrl}
                  onChange={(e) =>
                    setLocal({ ...local, externalApiUrl: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {t("settings.dataSource.externalUrl.hint")}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ext-token">
                  {t("settings.dataSource.externalToken")}
                </Label>
                <Input
                  id="ext-token"
                  type="password"
                  placeholder={
                    local.externalApiToken === "********"
                      ? t("settings.dataSource.externalToken.unchanged")
                      : ""
                  }
                  value={
                    local.externalApiToken === "********"
                      ? ""
                      : local.externalApiToken
                  }
                  onChange={(e) =>
                    setLocal({ ...local, externalApiToken: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {t("settings.dataSource.externalToken.hint")}
                </p>
              </div>
            </>
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
