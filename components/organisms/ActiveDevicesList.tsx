"use client";

import Link from "next/link";

import {
  deviceIconMap,
  deviceStatusKey,
  deviceStatusStyles,
} from "@/components/molecules/device-meta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDevices } from "@/hooks/useDevices";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";
import { useZoneStore } from "@/store/useZoneStore";

export function ActiveDevicesList() {
  const { t } = useT();
  const zoneId = useZoneStore((s) => s.selectedZoneId);
  const { data, isLoading } = useDevices(zoneId);

  // Show the 4-5 most relevant devices on the dashboard.
  const featuredIds = new Set(["dev-003", "dev-002", "dev-008", "dev-001"]);
  const devices =
    data?.devices.filter((d) => featuredIds.has(d.id)) ?? data?.devices ?? [];

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col p-5">
        <h3 className="mb-4 text-[15px] font-semibold text-foreground">
          {t("dashboard.activeDevices.title")}
        </h3>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-[#EAECEF]">
            {devices.map((device) => {
              const { icon: Icon, iconBg, iconColor } =
                deviceIconMap[device.deviceType];
              return (
                <li
                  key={device.id}
                  className="flex items-center gap-3 py-2.5"
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: iconBg }}
                    aria-hidden
                  >
                    <Icon className="h-4 w-4" style={{ color: iconColor }} />
                  </div>
                  <p className="flex-1 truncate text-sm font-medium text-foreground">
                    {device.name}
                  </p>
                  <Badge
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-medium",
                      deviceStatusStyles[device.status],
                    )}
                  >
                    {t(deviceStatusKey[device.status])}
                  </Badge>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                  >
                    <Link href={`/devices`}>
                      {t("dashboard.activeDevices.viewDetails")}
                    </Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
