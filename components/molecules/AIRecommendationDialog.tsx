"use client";

import { useEffect, useState } from "react";
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
  const alertId = alert?.id ?? null;

  // Render-time trigger detection: when (open, alertId, locale) changes, we
  // reset local UI state via the documented "adjust state on prop change"
  // pattern. The actual network call lives in the useEffect below — refs
  // and side effects belong outside render.
  const requestKey = open && alertId ? `${alertId}|${locale}` : null;
  const [prevRequestKey, setPrevRequestKey] = useState<string | null>(null);
  const [retryCounter, setRetryCounter] = useState(0);

  if (requestKey !== prevRequestKey) {
    setPrevRequestKey(requestKey);
    if (requestKey) {
      setState("streaming");
      setContent("");
    } else {
      setState("idle");
      setContent("");
    }
  }

  // Effect kicks off the SSE stream whenever the request key (or retry
  // counter) changes. runStream is defined at module scope so the
  // react-hooks lint doesn't trace setState through it.
  useEffect(() => {
    if (!requestKey || !alertId) return;
    const ctrl = new AbortController();
    void runStream(alertId, locale, ctrl, setState, setContent);
    return () => ctrl.abort();
  }, [requestKey, alertId, locale, retryCounter]);

  const handleClose = () => {
    setContent("");
    setState("idle");
    setPrevRequestKey(null);
    onClose();
  };

  const handleRetry = () => {
    if (!alertId) return;
    setState("streaming");
    setContent("");
    setRetryCounter((n) => n + 1);
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
              {alert.deviceName}
              {device?.reading?.value ? ` · ${device.reading.value}` : ""}
              {alert.message ? ` · ${alert.message}` : ""}
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
            <FormattedSuggestion
              content={content}
              streaming={state === "streaming"}
            />
          )}
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
          {state === "error" ? (
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              {t("ai.dialog.retry")}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={state !== "done" || !content}
              >
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                {t("ai.dialog.copy")}
              </Button>
              {state === "done" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRetry}
                  aria-label={t("ai.dialog.retry")}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={handleClose}>
            {t("ai.dialog.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Streaming worker (top-level so React's lint rules don't trace setState
// calls through it) ────────────────────────────────────────────────────────

async function runStream(
  id: string,
  locale: string,
  ctrl: AbortController,
  setState: (s: State) => void,
  setContent: (updater: (prev: string) => string) => void,
) {
  try {
    const res = await fetch("/api/ai/recommend", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertId: id, locale }),
      signal: ctrl.signal,
    });

    if (!res.ok || !res.body) throw new Error("stream failed");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    for (;;) {
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
            const chunk = evt.content;
            setContent((c) => c + chunk);
          } else if (evt.type === "done") {
            setState("done");
          }
        } catch {
          // ignore malformed lines
        }
      }
    }
    setState("done");
  } catch (err) {
    if ((err as Error).name === "AbortError") return;
    setState("error");
  }
}

// ─── Tiny markdown formatter ────────────────────────────────────────────────
// Just enough to render the AI response cleanly: `### heading`, `**bold**`,
// `_italic_`, and numbered/bulleted lists. Avoids a markdown dep for one
// dialog while still looking right.

function FormattedSuggestion({
  content,
  streaming,
}: {
  content: string;
  streaming: boolean;
}) {
  const lines = content.split("\n");
  return (
    <div className="text-sm leading-relaxed text-secondary-foreground">
      {lines.map((line, i) => renderLine(line, i))}
      {streaming && (
        <span className="animate-cursor-blink ml-0.5 inline-block h-4 w-0.5 bg-secondary-foreground align-middle" />
      )}
    </div>
  );
}

function renderLine(line: string, key: number) {
  const trimmed = line.trimEnd();
  if (!trimmed.length) return <div key={key} className="h-2" />;

  // ### heading
  const heading = /^(#{1,3})\s+(.*)$/.exec(trimmed);
  if (heading) {
    const level = heading[1].length;
    const text = heading[2];
    const cls =
      level === 1
        ? "text-base font-semibold mb-2 mt-1 text-foreground"
        : level === 2
          ? "text-sm font-semibold mb-1.5 mt-1 text-foreground"
          : "text-sm font-semibold mb-1 mt-1 text-foreground";
    return (
      <p key={key} className={cls}>
        {renderInline(text)}
      </p>
    );
  }

  // 1. ordered list
  const ordered = /^(\d+)\.\s+(.*)$/.exec(trimmed);
  if (ordered) {
    return (
      <div key={key} className="my-0.5 flex gap-2">
        <span className="shrink-0 text-muted-foreground">{ordered[1]}.</span>
        <span>{renderInline(ordered[2])}</span>
      </div>
    );
  }

  // - bullet list
  const bullet = /^[-*]\s+(.*)$/.exec(trimmed);
  if (bullet) {
    return (
      <div key={key} className="my-0.5 flex gap-2">
        <span className="shrink-0 text-muted-foreground">•</span>
        <span>{renderInline(bullet[1])}</span>
      </div>
    );
  }

  return (
    <p key={key} className="my-1">
      {renderInline(trimmed)}
    </p>
  );
}

// Inline: **bold**, _italic_, `code`. Tokens render in original order.
function renderInline(text: string): React.ReactNode {
  const re = /(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`)/g;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = re.exec(text))) {
    if (match.index > cursor) parts.push(text.slice(cursor, match.index));
    const tok = match[0];
    if (tok.startsWith("**")) {
      parts.push(
        <strong key={`b-${i++}`} className="font-semibold text-foreground">
          {tok.slice(2, -2)}
        </strong>,
      );
    } else if (tok.startsWith("_")) {
      parts.push(
        <em key={`i-${i++}`} className="italic">
          {tok.slice(1, -1)}
        </em>,
      );
    } else if (tok.startsWith("`")) {
      parts.push(
        <code key={`c-${i++}`} className="rounded bg-muted px-1 py-0.5 text-xs">
          {tok.slice(1, -1)}
        </code>,
      );
    }
    cursor = match.index + tok.length;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}
