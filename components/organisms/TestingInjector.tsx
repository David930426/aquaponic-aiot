"use client";

import { useMemo, useState } from "react";
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
import { useDevices } from "@/hooks/useDevices";
import { useT } from "@/hooks/useT";
import { api } from "@/lib/axios";
import { useZoneStore } from "@/store/useZoneStore";

interface IngestResult {
  deviceId: string;
  stored: boolean;
  isAnomaly: boolean;
  severity?: "warning" | "critical";
  message?: string;
}

const SENSOR_TYPES = new Set([
  "sensor_temp",
  "sensor_ph",
  "sensor_level",
  "sensor_do",
]);

export function TestingInjector() {
  const { t } = useT();
  const zoneId = useZoneStore((s) => s.selectedZoneId);
  const { data, isLoading } = useDevices(zoneId);
  const queryClient = useQueryClient();

  const sensors = useMemo(
    () => data?.devices.filter((d) => SENSOR_TYPES.has(d.deviceType)) ?? [],
    [data],
  );

  // `explicitDeviceId` tracks user selection; deviceId falls back to the
  // first sensor when nothing's been picked. Computing this during render
  // instead of using a sync-in-effect avoids the extra commit + lint warning.
  const [explicitDeviceId, setExplicitDeviceId] = useState<string>("");
  const deviceId = explicitDeviceId || sensors[0]?.id || "";
  const [value, setValue] = useState<string>("");

  const selected = sensors.find((d) => d.id === deviceId);
  const unit = selected?.reading?.unit ?? "";

  const mutation = useMutation({
    mutationFn: async () => {
      const n = Number(value);
      if (!Number.isFinite(n)) throw new Error("Invalid number");
      const { data } = await api.post<{ result: IngestResult }>(
        "/api/testing/inject",
        { deviceId, value: n },
      );
      return data.result;
    },
    onSuccess: (result) => {
      if (result.isAnomaly) {
        toast.warning(t("testing.injector.successAnomaly"));
      } else {
        toast.success(t("testing.injector.success"));
      }
      setValue("");
      queryClient.invalidateQueries({ queryKey: ["recent-readings"] });
      queryClient.invalidateQueries({ queryKey: ["recent-anomalies"] });
      queryClient.invalidateQueries({ queryKey: ["alerts", zoneId] });
      queryClient.invalidateQueries({ queryKey: ["devices", zoneId] });
      queryClient.invalidateQueries({ queryKey: ["water-quality", 7] });
    },
    onError: (err) => {
      const msg =
        (axios.isAxiosError(err) &&
          (err.response?.data as { message?: string } | undefined)?.message) ||
        t("testing.injector.failed");
      toast.error(msg);
    },
  });

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div>
          <h3 className="text-[15px] font-semibold text-foreground">
            {t("testing.injector.title")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t("testing.injector.subtitle")}
          </p>
        </div>

        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="injector-device">
                {t("testing.injector.device")}
              </Label>
              <Select value={deviceId} onValueChange={setExplicitDeviceId}>
                <SelectTrigger id="injector-device">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sensors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="injector-value">
                {t("testing.injector.value")}
                {unit ? ` (${unit})` : ""}
              </Label>
              <Input
                id="injector-value"
                type="number"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={selected?.reading?.value ?? ""}
              />
            </div>

            <Button
              onClick={() => mutation.mutate()}
              disabled={
                mutation.isPending ||
                !deviceId ||
                value === "" ||
                !Number.isFinite(Number(value))
              }
            >
              {mutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {mutation.isPending
                ? t("testing.injector.submitting")
                : t("testing.injector.submit")}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
