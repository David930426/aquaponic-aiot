"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/hooks/useT";
import type { Device, DeviceInput, DeviceType } from "@/types/api";

const DEVICE_TYPES: DeviceType[] = [
  "pump",
  "sensor_temp",
  "sensor_ph",
  "sensor_level",
  "sensor_do",
  "sensor_flow",
  "feeder",
  "lighting",
  "aeration",
];

const SENSOR_TYPES: DeviceType[] = [
  "sensor_temp",
  "sensor_ph",
  "sensor_level",
  "sensor_do",
  "sensor_flow",
];

const FormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  deviceType: z.enum([
    "pump",
    "sensor_temp",
    "sensor_ph",
    "sensor_level",
    "sensor_do",
    "sensor_flow",
    "feeder",
    "lighting",
    "aeration",
  ]),
  apiUrl: z.string().trim().url("Must be a valid URL").or(z.literal("")),
  apiToken: z.string(),
  readingUnit: z.string(),
  safeMin: z.string(),
  safeMax: z.string(),
  simBaseline: z.string(),
  simAmplitude: z.string(),
  simNoise: z.string(),
});
type FormValues = z.infer<typeof FormSchema>;

const numOrNull = (s: string): number | null => {
  const t = s.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

function toDefaults(device?: Device | null): FormValues {
  return {
    name: device?.name ?? "",
    deviceType: device?.deviceType ?? "sensor_temp",
    apiUrl: device?.apiUrl ?? "",
    apiToken: "",
    readingUnit: device?.readingUnit ?? "",
    safeMin: device?.safeMin != null ? String(device.safeMin) : "",
    safeMax: device?.safeMax != null ? String(device.safeMax) : "",
    simBaseline: device?.simBaseline != null ? String(device.simBaseline) : "",
    simAmplitude:
      device?.simAmplitude != null ? String(device.simAmplitude) : "",
    simNoise: device?.simNoise != null ? String(device.simNoise) : "",
  };
}

export interface DeviceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present → edit mode; absent → create mode. */
  device?: Device | null;
  isPending: boolean;
  onSubmit: (input: DeviceInput) => void;
}

export function DeviceFormDialog({
  open,
  onOpenChange,
  device,
  isPending,
  onSubmit,
}: DeviceFormDialogProps) {
  const { t } = useT();
  const isEdit = !!device;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: toDefaults(device),
  });

  // Re-seed the form whenever the dialog opens for a different device.
  const [seededFor, setSeededFor] = useState<string | null>(null);
  const key = open ? (device?.id ?? "__new__") : null;
  if (key !== seededFor) {
    setSeededFor(key);
    if (open) reset(toDefaults(device));
  }

  const deviceType = useWatch({ control, name: "deviceType" });
  const isSensor = SENSOR_TYPES.includes(deviceType);

  const submit = handleSubmit((v) => {
    const input: DeviceInput = {
      name: v.name.trim(),
      deviceType: v.deviceType,
      apiUrl: v.apiUrl.trim() || null,
      readingUnit: v.readingUnit.trim() || null,
      safeMin: isSensor ? numOrNull(v.safeMin) : null,
      safeMax: isSensor ? numOrNull(v.safeMax) : null,
      simBaseline: isSensor ? numOrNull(v.simBaseline) : null,
      simAmplitude: isSensor ? numOrNull(v.simAmplitude) : null,
      simNoise: isSensor ? numOrNull(v.simNoise) : null,
    };
    // Only send the token when the admin typed one (blank keeps existing).
    if (v.apiToken.trim()) input.apiToken = v.apiToken.trim();
    onSubmit(input);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("devices.form.editTitle") : t("devices.form.addTitle")}
          </DialogTitle>
          <DialogDescription>{t("devices.form.subtitle")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="dev-name">{t("devices.form.name")}</Label>
            <Input id="dev-name" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-[#B91C1C]">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>{t("devices.form.type")}</Label>
            <Controller
              control={control}
              name="deviceType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEVICE_TYPES.map((dt) => (
                      <SelectItem key={dt} value={dt}>
                        {t(`deviceType.${dt}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Data source + thresholds only apply to sensor devices.
              Feeders/pumps/lights/aeration are toggle-only actuators. */}
          {isSensor && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="dev-api">{t("devices.form.apiUrl")}</Label>
                <Input
                  id="dev-api"
                  placeholder="https://my-device.example.com/reading"
                  {...register("apiUrl")}
                />
                {errors.apiUrl && (
                  <p className="text-xs text-[#B91C1C]">
                    {errors.apiUrl.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {t("devices.form.apiUrl.hint")}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dev-token">{t("devices.form.apiToken")}</Label>
                <Input
                  id="dev-token"
                  type="password"
                  placeholder={
                    device?.hasApiToken
                      ? t("devices.form.apiToken.unchanged")
                      : ""
                  }
                  {...register("apiToken")}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="dev-unit">{t("devices.form.unit")}</Label>
                  <Input id="dev-unit" {...register("readingUnit")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dev-min">{t("devices.form.safeMin")}</Label>
                  <Input id="dev-min" type="number" step="any" {...register("safeMin")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dev-max">{t("devices.form.safeMax")}</Label>
                  <Input id="dev-max" type="number" step="any" {...register("safeMax")} />
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-foreground">
                  {t("devices.form.simSection")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("devices.form.simSection.hint")}
                </p>
                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="dev-base">{t("devices.form.simBaseline")}</Label>
                    <Input id="dev-base" type="number" step="any" {...register("simBaseline")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dev-amp">{t("devices.form.simAmplitude")}</Label>
                    <Input id="dev-amp" type="number" step="any" {...register("simAmplitude")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dev-noise">{t("devices.form.simNoise")}</Label>
                    <Input id="dev-noise" type="number" step="any" {...register("simNoise")} />
                  </div>
                </div>
              </div>
            </>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
