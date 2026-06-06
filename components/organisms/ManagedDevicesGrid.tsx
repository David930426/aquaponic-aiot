"use client";

import { useEffect, useState } from "react";
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
import { cn } from "@/lib/utils";
import { useZoneStore } from "@/store/useZoneStore";

// When the search palette navigates to `/devices#dev-002`, scroll the
// matching card into view and pulse a ring around it briefly so the user
// can see which one they picked.
function useFocusFromHash(ready: boolean): string | null {
  // Read the hash once on mount — lazy initializer avoids a setState-in-effect
  // for the initial value.
  const [focusId, setFocusId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.location.hash.slice(1) || null;
  });

  useEffect(() => {
    if (!ready || !focusId) return;
    // Wait one frame for the grid to render so getElementById finds the node.
    const scrollTimer = window.setTimeout(() => {
      const el = document.getElementById(`device-${focusId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
    // Clear the focus ring after a couple of seconds. setState in a deferred
    // callback isn't flagged by react-hooks/set-state-in-effect because it
    // isn't synchronous with the effect body.
    const clearTimer = window.setTimeout(() => setFocusId(null), 2500);
    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [ready, focusId]);

  return focusId;
}

export function ManagedDevicesGrid() {
  const zoneId = useZoneStore((s) => s.selectedZoneId);
  const { data, isLoading, error, refetch } = useDevices(zoneId);
  const toggle = useDeviceToggle(zoneId);
  const { t } = useT();
  const focusId = useFocusFromHash(!!data?.devices.length);

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
            <div
              key={device.id}
              id={`device-${device.id}`}
              className={cn(
                "rounded-2xl transition-shadow",
                focusId === device.id &&
                  "ring-2 ring-[#2E7D32] ring-offset-2 ring-offset-[#F4F6F8]",
              )}
            >
              <DeviceCard
                {...device}
                isPending={
                  toggle.isPending && toggle.variables?.id === device.id
                }
                onToggle={(id, enabled) => toggle.mutate({ id, enabled })}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
