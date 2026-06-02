"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useReadingLabel, useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";
import type { DeviceReading, DeviceStatus, DeviceType } from "@/types/api";

import {
  deviceIconMap,
  deviceStatusKey,
  deviceStatusStyles,
} from "./device-meta";

export interface DeviceCardProps {
  id: string;
  name: string;
  deviceType: DeviceType;
  status: DeviceStatus;
  isEnabled: boolean;
  reading?: DeviceReading | null;
  isLoading?: boolean;
  isPending?: boolean;
  onToggle: (id: string, enabled: boolean) => void;
}

export function DeviceCard({
  id,
  name,
  deviceType,
  status,
  isEnabled,
  reading,
  isLoading,
  isPending,
  onToggle,
}: DeviceCardProps) {
  const { t } = useT();
  const readingLabel = useReadingLabel();

  if (isLoading) return <DeviceCardSkeleton />;

  const { icon: Icon, iconBg, iconColor } = deviceIconMap[deviceType];

  return (
    <Card className="flex h-full flex-col transition-shadow duration-200 hover:shadow-(--shadow-panel)">
      <CardContent className="flex h-full flex-col p-5">
        <div
          className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: iconBg }}
          aria-hidden
        >
          <Icon className="h-5 w-5" style={{ color: iconColor }} />
        </div>

        <p className="mb-1.5 text-[15px] font-semibold leading-tight text-foreground">
          {name}
        </p>

        <Badge
          className={cn(
            "mb-3 w-fit rounded-full px-2 py-0.5 text-xs font-medium",
            deviceStatusStyles[status],
          )}
        >
          {t(deviceStatusKey[status])}
        </Badge>

        {reading && (
          <div className="mb-3">
            <p className="mb-0.5 text-xs text-muted-foreground">
              {readingLabel(reading.label)}
            </p>
            <p
              key={reading.value}
              className="animate-value-update text-[20px] font-semibold leading-none text-foreground"
            >
              {reading.value}
            </p>
          </div>
        )}

        <div className="mt-auto flex justify-end pt-2">
          <Switch
            checked={isEnabled}
            onCheckedChange={(checked) => onToggle(id, checked)}
            disabled={isPending}
            aria-label={t(
              isEnabled ? "devices.toggle.offAria" : "devices.toggle.onAria",
              { name },
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function DeviceCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <Skeleton className="mb-3 h-10 w-10 rounded-xl" />
        <Skeleton className="mb-1.5 h-4 w-32" />
        <Skeleton className="mb-3 h-5 w-16 rounded-full" />
        <Skeleton className="mb-1 h-3 w-24" />
        <Skeleton className="mb-3 h-6 w-20" />
        <div className="flex justify-end">
          <Skeleton className="h-5 w-9 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}
