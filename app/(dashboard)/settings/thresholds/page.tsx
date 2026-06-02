"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useThresholds, useUpdateThresholds } from "@/hooks/useThresholds";
import { useT } from "@/hooks/useT";
import type { SensorMetric, ThresholdSettings } from "@/lib/thresholds";
import type { MessageKey } from "@/lib/i18n/messages";

const METRICS: {
  key: SensorMetric;
  labelKey: MessageKey;
  unitKey: MessageKey;
  step: number;
}[] = [
  {
    key: "sensor_temp",
    labelKey: "settings.thresholds.label.temp",
    unitKey: "settings.thresholds.unit.temp",
    step: 0.1,
  },
  {
    key: "sensor_ph",
    labelKey: "settings.thresholds.label.ph",
    unitKey: "settings.thresholds.unit.ph",
    step: 0.1,
  },
  {
    key: "sensor_level",
    labelKey: "settings.thresholds.label.level",
    unitKey: "settings.thresholds.unit.level",
    step: 1,
  },
  {
    key: "sensor_do",
    labelKey: "settings.thresholds.label.do",
    unitKey: "settings.thresholds.unit.do",
    step: 0.1,
  },
];

export default function ThresholdsPage() {
  const { t } = useT();
  const { data, isLoading } = useThresholds();
  const mutation = useUpdateThresholds();

  const [local, setLocal] = useState<ThresholdSettings | null>(null);
  useEffect(() => {
    if (data) setLocal(data);
  }, [data]);

  if (isLoading || !local) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }

  const setMetric = (key: SensorMetric, field: "min" | "max", v: string) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return;
    setLocal({
      ...local,
      defaults: {
        ...local.defaults,
        [key]: { ...local.defaults[key], [field]: n },
      },
    });
  };

  const save = () => {
    for (const m of METRICS) {
      const range = local.defaults[m.key];
      if (range.min >= range.max) {
        toast.error(t("settings.thresholds.minMaxError"));
        return;
      }
    }
    mutation.mutate(
      {
        defaults: local.defaults,
        criticalDeltaPercent: local.criticalDeltaPercent,
      },
      {
        onSuccess: () => toast.success(t("settings.thresholds.saved")),
        onError: (err) => {
          const msg =
            (axios.isAxiosError(err) &&
              (err.response?.data as { message?: string } | undefined)
                ?.message) ||
            t("settings.thresholds.saveFailed");
          toast.error(msg);
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t("settings.thresholds.subtitle")}
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {METRICS.map((m) => {
          const range = local.defaults[m.key];
          return (
            <Card key={m.key}>
              <CardContent className="space-y-3 p-5">
                <div>
                  <p className="text-[15px] font-semibold text-foreground">
                    {t(m.labelKey)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(m.unitKey)}
                  </p>
                </div>
                <div className="flex items-end gap-3">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor={`${m.key}-min`}>
                      {t("settings.thresholds.min")}
                    </Label>
                    <Input
                      id={`${m.key}-min`}
                      type="number"
                      step={m.step}
                      value={range.min}
                      onChange={(e) => setMetric(m.key, "min", e.target.value)}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label htmlFor={`${m.key}-max`}>
                      {t("settings.thresholds.max")}
                    </Label>
                    <Input
                      id={`${m.key}-max`}
                      type="number"
                      step={m.step}
                      value={range.max}
                      onChange={(e) => setMetric(m.key, "max", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="space-y-2 p-5">
          <Label htmlFor="critical-delta">
            {t("settings.thresholds.criticalDelta")}
          </Label>
          <Input
            id="critical-delta"
            type="number"
            min={0}
            max={100}
            step={1}
            value={local.criticalDeltaPercent}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (!Number.isFinite(n)) return;
              setLocal({ ...local, criticalDeltaPercent: n });
            }}
            className="w-32"
          />
          <p className="text-xs text-muted-foreground">
            {t("settings.thresholds.criticalDelta.hint")}
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={mutation.isPending}>
          {mutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {t("settings.thresholds.save")}
        </Button>
      </div>
    </div>
  );
}
