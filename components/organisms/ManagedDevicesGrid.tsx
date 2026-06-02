"use client";

import { AlertTriangle, Cpu, RefreshCw } from "lucide-react";

import {
  DeviceCard,
  DeviceCardSkeleton,
} from "@/components/molecules/DeviceCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDeviceToggle } from "@/hooks/useDeviceToggle";
import { useDevices } from "@/hooks/useDevices";
import { useT } from "@/hooks/useT";
import { useZoneStore } from "@/store/useZoneStore";

export function ManagedDevicesGrid() {
  const zoneId = useZoneStore((s) => s.selectedZoneId);
  const { data, isLoading, error, refetch } = useDevices(zoneId);
  const toggle = useDeviceToggle(zoneId);
  const { t } = useT();

  return (
    <section className="mt-6">
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-[18px] font-semibold text-foreground">
          {t("dashboard.managedDevices.title")}
        </h2>
        {data?.zoneName && (
          <span className="text-xs text-muted-foreground">{data.zoneName}</span>
        )}
      </div>

      {error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <AlertTriangle className="mb-3 h-8 w-8 text-[#E65100]" />
            <p className="mb-3 text-sm font-medium text-foreground">
              {t("devices.error.title")}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              {t("devices.error.retry")}
            </Button>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="grid grid-cols-2 items-start gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <DeviceCardSkeleton key={i} />
          ))}
        </div>
      ) : !data?.devices.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-10 text-center">
            <Cpu className="mb-3 h-8 w-8 text-gray-400" />
            <p className="text-sm font-medium text-foreground">
              {t("devices.empty.title")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("devices.empty.subtitle")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 items-start gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.devices.map((device) => (
            <DeviceCard
              key={device.id}
              {...device}
              isPending={
                toggle.isPending && toggle.variables?.id === device.id
              }
              onToggle={(id, enabled) => toggle.mutate({ id, enabled })}
            />
          ))}
        </div>
      )}
    </section>
  );
}
