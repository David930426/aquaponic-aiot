"use client";

import { MoreVertical, Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  /** When provided, an actions (⋮) menu with Edit/Delete is shown. */
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
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
  onEdit,
  onDelete,
}: DeviceCardProps) {
  const { t } = useT();
  const readingLabel = useReadingLabel();

  if (isLoading) return <DeviceCardSkeleton />;

  const { icon: Icon, iconBg, iconColor } = deviceIconMap[deviceType];
  const showMenu = !!onEdit || !!onDelete;

  return (
    <Card className="flex h-full flex-col transition-shadow duration-200 hover:shadow-(--shadow-panel)">
      <CardContent className="flex h-full flex-col p-5">
        <div className="mb-3 flex items-start justify-between">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: iconBg }}
            aria-hidden
          >
            <Icon className="h-5 w-5" style={{ color: iconColor }} />
          </div>

          {showMenu && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground"
                  aria-label={t("devices.actions")}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(id)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    {t("devices.edit")}
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(id)}
                    className="text-[#B91C1C] focus:text-[#B91C1C]"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("devices.delete")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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
