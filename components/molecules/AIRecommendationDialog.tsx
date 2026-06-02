"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/hooks/useT";
import type { AlertItem, Device } from "@/types/api";

interface AIRecommendationDialogProps {
  open: boolean;
  onClose: () => void;
  alert: AlertItem | null;
  device: Device | null;
}

type State = "idle" | "streaming" | "done" | "error";

export function AIRecommendationDialog({
  open,
  onClose,
  alert,
  device,
}: AIRecommendationDialogProps) {
  const { t, locale } = useT();
  const [state, setState] = useState<State>("idle");
  const [content, setContent] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open || !alert) return;
    let active = true;
    setState("streaming");
    setContent("");
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    (async () => {
      try {
        const res = await fetch("/api/ai/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            alertId: alert.id,
            deviceId: alert.deviceId,
            context: {
              deviceName: alert.deviceName,
              sensorType: device?.deviceType ?? "",
              severity: alert.severity,
              currentValue:
                typeof device?.reading?.raw === "number"
                  ? device.reading.raw
                  : undefined,
              unit: device?.reading?.unit ?? "",
              trend: "up",
              locale,
            },
          }),
          signal: ctrl.signal,
        });

        if (!res.ok || !res.body) throw new Error("stream failed");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (active) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload) continue;
            try {
              const evt = JSON.parse(payload) as {
                type: string;
                content?: string;
              };
              if (evt.type === "chunk" && evt.content) {
                setContent((c) => c + evt.content);
              } else if (evt.type === "done") {
                setState("done");
              }
            } catch {
              // ignore malformed lines
            }
          }
        }
        if (active) setState((s) => (s === "streaming" ? "done" : s));
      } catch (err) {
        if (!active) return;
        if ((err as Error).name === "AbortError") return;
        setState("error");
      }
    })();

    return () => {
      active = false;
      ctrl.abort();
    };
  }, [open, alert, device, locale]);

  const handleClose = () => {
    abortRef.current?.abort();
    setContent("");
    setState("idle");
    onClose();
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    toast.success(t("ai.dialog.copied"));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E8F5E9] text-[#2E7D32]">
              <Bot className="h-4 w-4" />
            </span>
            {t("ai.dialog.title")}
          </DialogTitle>
          {alert && (
            <DialogDescription>
              {alert.deviceName} · {alert.message}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="max-h-100 overflow-y-auto rounded-lg border border-[#E4E7EC] bg-[hsl(220_9%_98%)] p-4">
          {state === "streaming" && !content ? (
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-4/6" />
              <p className="mt-3 text-xs text-muted-foreground">
                {t("ai.dialog.analyzing")}
              </p>
            </div>
          ) : state === "error" ? (
            <Alert variant="destructive">
              <AlertDescription>{t("ai.dialog.error")}</AlertDescription>
            </Alert>
          ) : (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-secondary-foreground">
              {content}
              {state === "streaming" && (
                <span className="animate-cursor-blink ml-0.5 inline-block h-4 w-0.5 bg-secondary-foreground align-middle" />
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
          {state === "error" ? (
            <Button variant="outline" size="sm" onClick={() => setState("idle")}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              {t("ai.dialog.retry")}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={state !== "done" || !content}
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              {t("ai.dialog.copy")}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleClose}>
            {t("ai.dialog.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
