"use client";

import { CheckCircle } from "lucide-react";

import { AlertCard } from "@/components/molecules/AlertCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useAlerts, useMarkAllAlertsRead } from "@/hooks/useAlerts";
import { useT } from "@/hooks/useT";
import { useAlertStore } from "@/store/useAlertStore";
import { useZoneStore } from "@/store/useZoneStore";

export function AlertSheet() {
  const isOpen = useAlertStore((s) => s.isSheetOpen);
  const closeSheet = useAlertStore((s) => s.closeSheet);
  const zoneId = useZoneStore((s) => s.selectedZoneId);
  const { t } = useT();
  const { data: alerts, isLoading } = useAlerts(zoneId);
  const markAllRead = useMarkAllAlertsRead(zoneId);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeSheet()}>
      <SheetContent
        side="right"
        className="flex w-100 flex-col p-0 sm:max-w-100"
      >
        <SheetHeader className="border-b border-[#EAECEF] px-5 py-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-semibold">
              {t("alerts.sheet.title")}
            </SheetTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending || !alerts?.length}
              >
                {t("alerts.sheet.markAllRead")}
              </Button>
              <Badge variant="secondary">{alerts?.length ?? 0}</Badge>
            </div>
          </div>
        </SheetHeader>
        <ScrollArea className="flex-1 px-4 py-3">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : !alerts?.length ? (
            <EmptyAlerts />
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
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function EmptyAlerts() {
  const { t } = useT();
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
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
