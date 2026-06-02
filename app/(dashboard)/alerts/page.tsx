"use client";

import { useState } from "react";
import { CheckCircle } from "lucide-react";

import { AlertCard } from "@/components/molecules/AlertCard";
import { AIRecommendationDialog } from "@/components/molecules/AIRecommendationDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAlerts } from "@/hooks/useAlerts";
import { useDevices } from "@/hooks/useDevices";
import { useT } from "@/hooks/useT";
import { useZoneStore } from "@/store/useZoneStore";

export default function AlertsPage() {
  const zoneId = useZoneStore((s) => s.selectedZoneId);
  const { t } = useT();
  const { data: alerts, isLoading } = useAlerts(zoneId);
  const { data: devicesData } = useDevices(zoneId);
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);

  const activeAlert = alerts?.find((a) => a.id === activeAlertId);
  const activeDevice = devicesData?.devices.find(
    (d) => d.id === activeAlert?.deviceId,
  );

  return (
    <div className="mx-auto max-w-225">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold text-foreground">
          {t("alerts.page.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("alerts.page.subtitle")}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : !alerts?.length ? (
        <AlertsEmpty />
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <AlertCard
              key={a.id}
              id={a.id}
              deviceName={a.deviceName}
              severity={a.severity}
              message={a.message}
              triggeredAt={a.triggeredAt}
              onGetAIHelp={(id) => setActiveAlertId(id)}
            />
          ))}
        </div>
      )}

      <AIRecommendationDialog
        open={!!activeAlertId}
        onClose={() => setActiveAlertId(null)}
        alert={activeAlert ?? null}
        device={activeDevice ?? null}
      />
    </div>
  );
}

function AlertsEmpty() {
  const { t } = useT();
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-[#E4E7EC] bg-white px-6 py-20 text-center shadow-(--shadow-card)">
      <CheckCircle className="mb-3 h-10 w-10 text-[#4CAF50]" />
      <p className="text-sm font-medium text-foreground">
        {t("alerts.empty.title")}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {t("alerts.empty.subtitle")}
      </p>
    </div>
  );
}
