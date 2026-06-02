"use client";

import { formatDistanceToNow } from "date-fns";
import {
  BellOff,
  BellRing,
  CheckCircle,
  Clock,
  Loader2,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDismissNotification,
  useNewNotificationToasts,
  useNotifications,
  useSnoozeNotification,
} from "@/hooks/useNotifications";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";
import { useAlertStore } from "@/store/useAlertStore";

const SNOOZE_OPTIONS = [5, 15, 60] as const;

export function NotificationSheet() {
  const isOpen = useAlertStore((s) => s.isSheetOpen);
  const closeSheet = useAlertStore((s) => s.closeSheet);
  const { t, dateLocale } = useT();
  const { data: items, isLoading } = useNotifications();
  useNewNotificationToasts(items);

  const dismiss = useDismissNotification();
  const snooze = useSnoozeNotification();
  const push = usePushSubscription();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeSheet()}>
      <SheetContent
        side="right"
        className="flex w-100 flex-col p-0 sm:max-w-100"
      >
        <SheetHeader className="border-b border-[#EAECEF] px-5 py-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-semibold">
              {t("notifications.title")}
            </SheetTitle>
            <Badge variant="secondary">{items?.length ?? 0}</Badge>
          </div>
        </SheetHeader>

        <PushBanner status={push.status} subscribe={push.subscribe} unsubscribe={push.unsubscribe} isWorking={push.isWorking} />

        <ScrollArea className="flex-1 px-4 py-3">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : !items?.length ? (
            <Empty />
          ) : (
            <div className="space-y-3">
              {items.map((n) => (
                <Card key={n.id} className={cn("border-l-3 border-l-[#2E7D32]")}>
                  <CardContent className="p-4">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {n.title}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label={t("notifications.dismissAria")}
                        onClick={() => dismiss.mutate(n.id)}
                        disabled={dismiss.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="mb-3 text-sm leading-relaxed text-[hsl(220_13%_25%)]">
                      {n.body}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(n.triggeredAt), {
                          addSuffix: true,
                          locale: dateLocale,
                        })}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1.5 text-xs"
                            disabled={snooze.isPending}
                          >
                            <Clock className="h-3.5 w-3.5" />
                            {t("notifications.snooze")}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-32">
                          {SNOOZE_OPTIONS.map((min) => (
                            <DropdownMenuItem
                              key={min}
                              onClick={() =>
                                snooze.mutate({ id: n.id, minutes: min })
                              }
                            >
                              {t("notifications.snoozeMinutes", { minutes: min })}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function PushBanner({
  status,
  subscribe,
  unsubscribe,
  isWorking,
}: {
  status: ReturnType<typeof usePushSubscription>["status"];
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  isWorking: boolean;
}) {
  const { t } = useT();

  if (status === "unsupported") {
    return (
      <div className="flex items-start gap-2 border-b border-[#EAECEF] bg-[hsl(220_9%_97%)] px-5 py-3 text-xs text-muted-foreground">
        <BellOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{t("notifications.push.unsupported")}</span>
      </div>
    );
  }
  if (status === "blocked") {
    return (
      <div className="flex items-start gap-2 border-b border-[#EAECEF] bg-[#FFF8E1] px-5 py-3 text-xs text-[#E65100]">
        <BellOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{t("notifications.push.blocked")}</span>
      </div>
    );
  }
  if (status === "default") {
    return (
      <div className="flex items-center justify-between gap-2 border-b border-[#EAECEF] bg-[#F0F7F1] px-5 py-3">
        <div className="flex items-start gap-2 text-xs">
          <BellRing className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2E7D32]" />
          <div>
            <p className="font-medium text-foreground">
              {t("notifications.push.enableTitle")}
            </p>
            <p className="mt-0.5 text-muted-foreground">
              {t("notifications.push.enableSubtitle")}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="h-7 shrink-0 text-xs"
          onClick={subscribe}
          disabled={isWorking}
        >
          {isWorking ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            t("notifications.push.enable")
          )}
        </Button>
      </div>
    );
  }
  // subscribed
  return (
    <div className="flex items-center justify-between gap-2 border-b border-[#EAECEF] bg-[#E8F5E9] px-5 py-3 text-xs">
      <span className="flex items-center gap-2 text-[#2E7D32]">
        <CheckCircle className="h-3.5 w-3.5" />
        {t("notifications.push.enabled")}
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs text-muted-foreground hover:text-foreground"
        onClick={unsubscribe}
        disabled={isWorking}
      >
        {t("notifications.push.disable")}
      </Button>
    </div>
  );
}

function Empty() {
  const { t } = useT();
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <CheckCircle className="mb-3 h-10 w-10 text-[#4CAF50]" />
      <p className="text-sm font-medium text-foreground">
        {t("notifications.empty.title")}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {t("notifications.empty.subtitle")}
      </p>
    </div>
  );
}
