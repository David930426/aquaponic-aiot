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

export function TestingSimulator() {
  const { t } = useT();
  const { data, isLoading } = useAppSettings();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<DataSource>("passive");
  const [intervalSec, setIntervalSec] = useState<number>(5);
  const [refreshSec, setRefreshSec] = useState<number>(15);

  // Render-time sync of server settings into editable local state — React's
  // documented pattern for "adjust state when a prop changes" without
  // bouncing through useEffect.
  const [prevData, setPrevData] = useState<typeof data>(undefined);
  if (data !== prevData) {
    setPrevData(data);
    if (data) {
      setMode(data.dataSource);
      setIntervalSec(data.simulatorIntervalSec);
      setRefreshSec(data.chartRefreshSec);
    }
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
      toast.success(t("testing.simulator.saved"));
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

  if (isLoading || !data) {
    return (
      <Card>
        <CardContent className="p-5">
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div>
          <h3 className="text-[15px] font-semibold text-foreground">
            {t("testing.simulator.title")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t("testing.simulator.subtitle")}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>{t("testing.simulator.mode")}</Label>
          <Select value={mode} onValueChange={(v) => setMode(v as DataSource)}>
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
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="sim-interval">
              {t("testing.simulator.interval")}
            </Label>
            <Input
              id="sim-interval"
              type="number"
              min={1}
              max={3600}
              value={intervalSec}
              onChange={(e) => setIntervalSec(Number(e.target.value))}
              disabled={mode !== "simulator"}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sim-refresh">
              {t("testing.simulator.refresh")}
            </Label>
            <Input
              id="sim-refresh"
              type="number"
              min={5}
              max={3600}
              value={refreshSec}
              onChange={(e) => setRefreshSec(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={() =>
              mutation.mutate({
                dataSource: mode,
                simulatorIntervalSec: intervalSec,
                chartRefreshSec: refreshSec,
              })
            }
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {t("testing.simulator.save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
