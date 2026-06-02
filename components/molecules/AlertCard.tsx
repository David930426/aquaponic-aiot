"use client";

import { formatDistanceToNow } from "date-fns";
import { Sparkles, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";

export interface AlertCardProps {
  id: string;
  deviceName: string;
  severity: "warning" | "critical" | "info";
  message: string;
  triggeredAt: string;
  className?: string;
  onDismiss?: (id: string) => void;
  onGetAIHelp?: (id: string) => void;
}

const severityStyles: Record<AlertCardProps["severity"], string> = {
  warning: "border-l-3 border-l-[#F59E0B]",
  critical: "border-l-3 border-l-[#EF4444]",
  info: "border-l-3 border-l-[#3B82F6]",
};

const severityBadge: Record<AlertCardProps["severity"], string> = {
  warning: "bg-[#FFF8E1] text-[#E65100]",
  critical: "bg-[#FEF2F2] text-[#B91C1C]",
  info: "bg-[#EFF6FF] text-[#1D4ED8]",
};

export function AlertCard({
  id,
  deviceName,
  severity,
  message,
  triggeredAt,
  className,
  onDismiss,
  onGetAIHelp,
}: AlertCardProps) {
  const { t, dateLocale } = useT();
  const when = formatDistanceToNow(new Date(triggeredAt), {
    addSuffix: true,
    locale: dateLocale,
  });
  const severityLabel = t(
    severity === "critical"
      ? "alerts.severity.critical"
      : severity === "info"
        ? "alerts.severity.info"
        : "alerts.severity.warning",
  );

  return (
    <Card className={cn(severityStyles[severity], className)}>
      <CardContent className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">
              {deviceName}
            </p>
            <Badge
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                severityBadge[severity],
              )}
            >
              {severityLabel}
            </Badge>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label={t("alerts.dismissAria")}
              onClick={() => onDismiss(id)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="mb-3 text-sm leading-relaxed text-[hsl(220_13%_25%)]">
          {message}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{when}</span>
          {onGetAIHelp && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onGetAIHelp(id)}
              className="h-7 gap-1.5 text-xs"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t("alerts.getAIHelp")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
