"use client";

import { useMemo, useState } from "react";
import axios from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import type { MessageKey } from "@/lib/i18n/messages";
import { useZoneStore } from "@/store/useZoneStore";

type FaultMode = "offline" | "restore" | "stuck" | "spike_high" | "spike_low";

const SENSOR_TYPES = new Set([
  "sensor_temp",
  "sensor_ph",
  "sensor_level",
  "sensor_do",
  "sensor_flow",
]);

const FAULT_MODES: {
  value: FaultMode;
  labelKey: MessageKey;
  hintKey: MessageKey;
}[] = [
  {
    value: "offline",
    labelKey: "testing.fault.mode.offline",
    hintKey: "testing.fault.modeHint.offline",
  },
  {
    value: "stuck",
    labelKey: "testing.fault.mode.stuck",
    hintKey: "testing.fault.modeHint.stuck",
  },
  {
    value: "spike_high",
    labelKey: "testing.fault.mode.spike_high",
    hintKey: "testing.fault.modeHint.spike_high",
  },
  {
    value: "spike_low",
    labelKey: "testing.fault.mode.spike_low",
    hintKey: "testing.fault.modeHint.spike_low",
  },
  {
    value: "restore",
    labelKey: "testing.fault.mode.restore",
    hintKey: "testing.fault.modeHint.restore",
  },
];

interface FaultResponse {
  mode: FaultMode;
  value?: number;
  device?: { id: string; status: string };
  result?: { isAnomaly: boolean; severity?: "warning" | "critical" };
  alertId?: string;
}

export function TestingFaultInjection() {
  const { t } = useT();
  const zoneId = useZoneStore((s) => s.selectedZoneId);
  const { data, isLoading } = useDevices(zoneId);
  const queryClient = useQueryClient();

  // Fault injection targets sensor devices specifically (where the safe-range
  // breach logic actually applies). Other device types are filtered out.
  const sensors = useMemo(
    () => data?.devices.filter((d) => SENSOR_TYPES.has(d.deviceType)) ?? [],
    [data],
  );

  const [explicitDeviceId, setExplicitDeviceId] = useState<string>("");
  const deviceId = explicitDeviceId || sensors[0]?.id || "";
  const [mode, setMode] = useState<FaultMode>("offline");

  const activeMode = FAULT_MODES.find((m) => m.value === mode) ?? FAULT_MODES[0];

  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<FaultResponse>("/api/testing/fault", {
        deviceId,
        mode,
      });
      return data;
    },
    onSuccess: (resp) => {
      const successKey = (
        {
          offline: "testing.fault.success.offline",
          restore: "testing.fault.success.restore",
          stuck: "testing.fault.success.stuck",
          spike_high: "testing.fault.success.spike",
          spike_low: "testing.fault.success.spike",
        } satisfies Record<FaultMode, MessageKey>
      )[resp.mode];

      if (resp.mode === "spike_high" || resp.mode === "spike_low") {
        toast.error(
          t(successKey, { value: resp.value?.toFixed(2) ?? "?" }),
        );
      } else if (resp.mode === "offline") {
        toast.error(t(successKey));
      } else {
        toast.success(t(successKey));
      }

      queryClient.invalidateQueries({ queryKey: ["devices", zoneId] });
      queryClient.invalidateQueries({ queryKey: ["alerts", zoneId] });
      queryClient.invalidateQueries({ queryKey: ["recent-readings"] });
      queryClient.invalidateQueries({ queryKey: ["recent-anomalies"] });
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
      queryClient.invalidateQueries({ queryKey: ["health-summary"] });
    },
    onError: (err) => {
      if (
        axios.isAxiosError(err) &&
        (err.response?.data as { error?: string } | undefined)?.error ===
          "NO_RANGE"
      ) {
        toast.error(t("testing.fault.noSpikeRange"));
        return;
      }
      const msg =
        (axios.isAxiosError(err) &&
          (err.response?.data as { message?: string } | undefined)?.message) ||
        t("testing.fault.failed");
      toast.error(msg);
    },
  });

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FEF2F2] text-[#B91C1C]">
            <ShieldAlert className="h-3.5 w-3.5" />
          </span>
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">
              {t("testing.fault.title")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("testing.fault.subtitle")}
            </p>
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="fault-device">
                {t("testing.fault.device")}
              </Label>
              <Select
                value={deviceId}
                onValueChange={setExplicitDeviceId}
              >
                <SelectTrigger id="fault-device">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sensors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                      {d.status === "offline"
                        ? ` · ${t("deviceStatus.offline")}`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fault-mode">{t("testing.fault.mode")}</Label>
              <Select
                value={mode}
                onValueChange={(v) => setMode(v as FaultMode)}
              >
                <SelectTrigger id="fault-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FAULT_MODES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {t(m.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t(activeMode.hintKey)}
              </p>
            </div>

            <Button
              variant={mode === "restore" ? "default" : "destructive"}
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !deviceId}
            >
              {mutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {mutation.isPending
                ? t("testing.fault.submitting")
                : t("testing.fault.submit")}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
